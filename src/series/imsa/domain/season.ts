// IMSA season from its Wikipedia article: schedule, class winners and the standings of every class.
// Classes changed over the years (P, PC, DPi, GTLM, GTP…); they are read from the tables themselves.
import { parseStandings, type Named, type StandingTable } from '../../../lib/wikiStandings';
import {
  cleanText,
  columnIndex,
  groupRows,
  parseHtml,
  wikiTables,
  type WikiCell,
  type WikiTable,
} from '../../../lib/wikitable';

export interface ImsaClassWinner {
  /** Class code as the source writes it in the results table, e.g. "GTP", "GTD Pro". */
  cls: string;
  /** Team cell as published, e.g. "#7 Porsche Penske Motorsport". */
  team: Named | null;
  drivers: Named[];
}

export interface ImsaRace {
  round: number;
  name: string;
  length: string;
  /** Classes taking part, as the schedule lists them ("All", "GTP, GTD"). */
  classes: string;
  circuit: Named | null;
  location: string;
  dateText: string;
  /** ISO dates of the race weekend (one day or a 24-hour race over two). */
  start: string | null;
  end: string | null;
  /** Race article (the results table links to it); full classification lives there. */
  report: string | null;
  winners: ImsaClassWinner[];
}

export interface ImsaStanding extends StandingTable {
  /** Class code, e.g. "GTP"; the standings of one class are grouped together. */
  cls: string;
}

export interface ImsaSeasonData {
  id: string;
  article: string;
  races: ImsaRace[];
  standings: ImsaStanding[];
  unavailable?: boolean;
}

// Full class names used in headings, to the codes of the results table.
const CLASS_CODES: Record<string, string> = {
  'grand touring prototype': 'GTP',
  'daytona prototype international': 'DPi',
  'le mans prototype 2': 'LMP2',
  'le mans prototype 3': 'LMP3',
  'gt le mans': 'GTLM',
  'gt daytona pro': 'GTD Pro',
  'gt daytona': 'GTD',
  'prototype challenge': 'PC',
  prototype: 'P',
};

/** "Standings: Grand Touring Prototype (GTP)" → "GTP"; "Prototype" → "P"; unknown text stays as is. */
export function classCode(text: string): string | null {
  const name = text.replace(/^Standings:\s*/i, '').trim();
  const code = /\(([^)]+)\)\s*$/.exec(name)?.[1];
  if (code) return code;
  const known = CLASS_CODES[name.toLowerCase()];
  if (known) return known;
  return Object.values(CLASS_CODES).includes(name) ? name : null;
}

const MONTHS = 'january february march april may june july august september october november december'.split(
  ' ',
);

/** "January 24–25" / "March 21" / "September 30 – October 1" in a season → ISO start and end. */
export function parseImsaDates(text: string, year: string): { start: string | null; end: string | null } {
  const parts = [...text.matchAll(/([A-Za-z]+)?\s*(\d{1,2})/g)];
  let month = -1;
  const days = parts.flatMap((m) => {
    if (m[1]) month = MONTHS.indexOf(m[1].toLowerCase());
    return month < 0 ? [] : [`${year}-${String(month + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`];
  });
  return { start: days[0] ?? null, end: days.at(-1) ?? null };
}

/** Headings above a table, outermost first (h2 › h3 › h4), from plain or wrapped (div.mw-heading) headings. */
export function headingPath(el: Element): string[] {
  let top = el;
  while (
    top.parentElement &&
    top.parentElement.tagName !== 'BODY' &&
    !top.parentElement.matches('.mw-parser-output')
  )
    top = top.parentElement;
  const path: string[] = [];
  let level = 7;
  for (let p = top.previousElementSibling; p && level > 2; p = p.previousElementSibling) {
    const h = p.matches('h2,h3,h4,h5')
      ? p
      : p.matches('div.mw-heading')
        ? p.querySelector('h2,h3,h4,h5')
        : null;
    const l = h ? Number(h.tagName[1]) : 7;
    if (h && l < level) {
      path.unshift(cleanText(h));
      level = l;
    }
  }
  return path;
}

function named(cell: WikiCell | undefined): Named | null {
  const text = cell?.text.trim() ?? '';
  if (!cell || !text || /^(—|-|TBA|TBD)$/i.test(text)) return null;
  return { name: text, article: cell.links[0]?.title ?? null, flag: cell.flags[0] ?? null };
}

function people(cell: WikiCell | undefined): Named[] {
  return (cell?.lines ?? [])
    .filter((line) => line.text.trim())
    .map((line) => ({
      name: (line.link?.text || line.text).trim(),
      article: line.link?.title ?? null,
      flag: line.flag,
    }));
}

function parseSchedule(table: WikiTable, year: string): ImsaRace[] {
  const col = (re: RegExp) => columnIndex(table, re);
  const [round, race, length, classes, circuit, location, date] = [
    col(/^Rnd/i),
    col(/^Race$/i),
    col(/^Length/i),
    col(/^Classes/i),
    col(/^Circuit/i),
    col(/^Location/i),
    col(/^Date/i),
  ];
  return table.rows
    .filter((row) => /^\d+$/.test(row[round]?.text.trim() ?? '') && row[race]?.el !== row[round]?.el)
    .map((row) => {
      const dateText = row[date]?.text.trim() ?? '';
      return {
        round: Number(row[round].text.trim()),
        name: row[race]?.text.trim() ?? '',
        length: row[length]?.text.trim() ?? '',
        classes: classes >= 0 ? (row[classes]?.text.trim() ?? '') : '',
        circuit: named(row[circuit]),
        location: row[location]?.text.trim() ?? '',
        dateText,
        ...parseImsaDates(dateText, year),
        report: null,
        winners: [],
      };
    });
}

/** Results table: per round a row of winning teams and a row of winning drivers, a pair of columns per class. */
function addWinners(races: ImsaRace[], table: WikiTable) {
  const round = columnIndex(table, /^Rnd/i);
  const report = columnIndex(table, /^Report/i);
  const classes = table.columns
    .map((column, i) => ({ i, cls: /^(.+?) Winning Team/i.exec(column)?.[1] }))
    .filter((c): c is { i: number; cls: string } => !!c.cls);
  for (const group of groupRows(table.rows, round)) {
    const race = races.find((r) => String(r.round) === group[0][round]?.text.trim());
    if (!race) continue;
    race.report = group[0][report]?.links[0]?.title ?? null;
    race.winners = classes.flatMap(({ i, cls }) => {
      const team = named(group[0][i]);
      // A class that did not race this round has an empty or spanning cell.
      if (!team || group[0][i]?.el === group[0][i - 1]?.el) return [];
      return [{ cls: classCode(cls) ?? cls, team, drivers: group[1] ? people(group[1][i]) : [] }];
    });
  }
}

const GENERIC =
  /^(championship standings|results and standings|standings|drivers'?|teams'?|manufacturers'?|drivers' championships?|team'?s'? championships?|manufacturer'?s'? championships?)$/i;

function parseClassStandings(doc: Document, tables: WikiTable[]): ImsaStanding[] {
  const out: ImsaStanding[] = [];
  const ids = new Set<string>();
  for (const table of tables) {
    const [parsed] = parseStandings(doc, [table], { series: 'fe' });
    if (!parsed) continue;
    const path = headingPath(table.el);
    const cls = [...path].reverse().map(classCode).find(Boolean);
    if (!cls) continue;
    // Name of the table without the class: "Drivers", "Engine manufacturers"…
    const rest = path.filter((h) => !classCode(h) && !/standings$/i.test(h) && !/^points/i.test(h));
    const kind = /engine|chassis|tire|tyre|manufactur/i.test(parsed.nameHeader)
      ? 'manufacturers'
      : parsed.kind;
    const leaf = rest.at(-1);
    const title = `${leaf && !GENERIC.test(leaf) ? leaf : { drivers: 'Пилоты', teams: 'Команды', manufacturers: 'Производители' }[kind]} · ${cls}`;
    let id = `${cls}-${kind}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    for (let n = 2; ids.has(id); n++) id = `${cls}-${kind}-${n}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    ids.add(id);
    out.push({ ...parsed, id, title, kind, cls });
  }
  return out;
}

/** Some standings headers mark endurance rounds with <td> cells; read the whole first row as a header. */
function promoteHeaderCells(doc: Document) {
  for (const row of doc.querySelectorAll('table.wikitable > tbody > tr:first-child')) {
    if (!/^Pos/i.test(row.firstElementChild?.textContent?.trim() ?? '')) continue;
    for (const td of [...row.querySelectorAll(':scope > td')]) {
      const th = doc.createElement('th');
      for (const attr of [...td.attributes]) th.setAttribute(attr.name, attr.value);
      th.append(...td.childNodes);
      td.replaceWith(th);
    }
  }
}

export function parseImsaSeason(id: string, article: string, html: string): ImsaSeasonData {
  const doc = parseHtml(html);
  promoteHeaderCells(doc);
  const tables = wikiTables(doc);
  const schedule = tables.find((t) => columnIndex(t, /^Rnd/i) === 0 && columnIndex(t, /^Date/i) > 0);
  const races = schedule ? parseSchedule(schedule, id) : [];
  const results = tables.find((t) => t.columns.some((c) => /Winning Team/i.test(c)));
  if (results) addWinners(races, results);
  return { id, article, races, standings: parseClassStandings(doc, tables) };
}

/** Classes in the order the results table lists them, then any class only the standings know. */
export function seasonClasses(data: ImsaSeasonData): string[] {
  const all = [
    ...data.races.flatMap((r) => r.winners.map((w) => w.cls)),
    ...data.standings.map((t) => t.cls),
  ];
  return [...new Set(all)];
}

// --- statuses ---

export type ImsaStatus = 'completed' | 'live' | 'upcoming' | 'awaiting' | 'unknown';
export const IMSA_STATUS_LABELS: Record<ImsaStatus, string> = {
  completed: 'Завершена',
  live: 'Идёт',
  upcoming: 'Предстоящая',
  awaiting: 'Ждём результаты',
  unknown: 'Дата не указана',
};

const localDay = (now: Date) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

export function imsaRaceStatus(race: ImsaRace, now: Date): ImsaStatus {
  if (race.winners.length > 0) return 'completed';
  if (!race.start || !race.end) return 'unknown';
  const today = localDay(now);
  return today < race.start ? 'upcoming' : today <= race.end ? 'live' : 'awaiting';
}

export const nextImsaRace = (races: ImsaRace[], now: Date) =>
  races.find((race) => ['live', 'upcoming'].includes(imsaRaceStatus(race, now))) ?? null;

export const lastImsaRace = (races: ImsaRace[]) =>
  [...races].reverse().find((race) => race.winners.length) ?? null;

export function daysUntilImsa(race: ImsaRace, now: Date): number | null {
  if (!race.start) return null;
  const [y, m, d] = race.start.split('-').map(Number);
  return Math.round(
    (Date.UTC(y, m - 1, d) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86_400_000,
  );
}
