// Reads WEC data out of Wikipedia articles. Columns are found by their header names,
// classes and championship names are taken from the tables themselves, and nothing
// is added that the source does not show.
import {
  columnIndex,
  groupRows,
  parseHtml,
  wikiTables,
  type WikiCell,
  type WikiLine,
  type WikiTable,
} from '../../../lib/wikitable';
import type {
  CancelledRace,
  ClassWinner,
  Named,
  PracticeSession,
  QualifyingTable,
  RaceEntry,
  ResultTone,
  StandingKind,
  StandingRow,
  StandingTable,
  WecRaceData,
  WecRound,
  WecSeasonData,
} from './types';

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

function month(name: string | undefined): number {
  if (!name) return -1;
  const n = name.toLowerCase();
  return MONTHS.findIndex((m) => m.startsWith(n.slice(0, 3)));
}

/**
 * Reads dates like "19 April", "13–14 June", "23/24 July 2019", "30 November – 1 December".
 * The year comes from the text, else from the season (first year of a split season).
 */
export function parseDates(text: string, seasonId: string): { start: string | null; end: string | null } {
  const t = text.replace(/\[[^\]]*\]/g, '').trim();
  const fallbackYear = Number(seasonId.slice(0, 4));
  const range = /(\d{1,2})\s*([A-Za-z]+)?\s*(?:[–—-]|\/|to)\s*(\d{1,2})\s+([A-Za-z]+)(?:,?\s+(\d{4}))?/.exec(
    t,
  );
  if (range) {
    const m2 = month(range[4]);
    const m1 = range[2] ? month(range[2]) : m2;
    const y = range[5] ? Number(range[5]) : fallbackYear;
    if (m1 >= 0 && m2 >= 0) {
      const y1 = m1 > m2 ? y - 1 : y;
      return { start: iso(y1, m1, Number(range[1])), end: iso(y, m2, Number(range[3])) };
    }
  }
  const single = /(\d{1,2})\s+([A-Za-z]+)(?:,?\s+(\d{4}))?/.exec(t);
  if (single && month(single[2]) >= 0) {
    const d = iso(single[3] ? Number(single[3]) : fallbackYear, month(single[2]), Number(single[1]));
    return { start: d, end: d };
  }
  return { start: null, end: null };
}

function named(line: WikiLine | undefined): Named | null {
  if (!line) return null;
  const name = (line.link?.text || line.text).trim();
  if (!name) return null;
  return { name, article: line.link?.title ?? null, flag: line.flag };
}

function namedCell(cell: WikiCell | undefined): Named | null {
  if (!cell) return null;
  const first = cell.lines.find((l) => l.text);
  if (!first) return null;
  // A cell with one flag and one link but split into pieces still names one thing.
  return named({ ...first, text: cell.text, link: first.link ?? cell.links[0] ?? null });
}

function intOf(text: string | undefined): number | null {
  const m = /^\s*(\d+)/.exec(text ?? '');
  return m ? Number(m[1]) : null;
}

const cellAt = (row: WikiCell[] | undefined, i: number): WikiCell | undefined =>
  i >= 0 ? row?.[i] : undefined;
const textAt = (row: WikiCell[] | undefined, i: number): string => cellAt(row, i)?.text ?? '';
const orNull = (s: string) => (s && s !== '—' && s !== '-' ? s : null);

/** One spelling per class: "LMP2(Pro-Am)" and "LMP2 Pro-Am" are the same class. */
export function normalizeClass(cls: string): string {
  return cls
    .replace(/\s*\(\s*([^)]*?)\s*\)/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Removes the marks Wikipedia adds to results ("‡" class winner, "†" notes). */
const stripMarks = (s: string) => s.replace(/[‡†*]+/g, '').trim();

// ---------- Season: calendar ----------

function isCalendar(t: WikiTable): boolean {
  return (
    columnIndex(t, /^(Rnd|Round)/i) === 0 &&
    columnIndex(t, /^Race/i) > 0 &&
    columnIndex(t, /Date/i) > 0 &&
    columnIndex(t, /Circuit/i) > 0
  );
}

function parseCalendar(
  doc: Document,
  seasonId: string,
): { rounds: Omit<WecRound, 'report' | 'winners'>[]; cancelled: CancelledRace[] } {
  const table = wikiTables(doc).find(isCalendar);
  if (!table) return { rounds: [], cancelled: [] };
  const race = columnIndex(table, /^Race/i);
  const circuit = columnIndex(table, /Circuit/i);
  const location = columnIndex(table, /Location/i);
  const date = columnIndex(table, /Date/i);
  const rounds: Omit<WecRound, 'report' | 'winners'>[] = [];
  const cancelled: CancelledRace[] = [];
  let inCancelled = false;
  for (const row of table.rows) {
    if (row.every((c) => c?.header)) {
      if (row.some((c) => /cancel|postpone/i.test(c?.text ?? ''))) inCancelled = true;
      continue;
    }
    const name = textAt(row, race);
    if (!name || /^sources?:?$/i.test(name) || cellAt(row, race)?.el === cellAt(row, date)?.el) continue;
    if (inCancelled) {
      cancelled.push({ name, circuit: namedCell(cellAt(row, circuit)), dateText: textAt(row, date) });
      continue;
    }
    const round = intOf(textAt(row, 0));
    if (round === null) continue; // prologue and test days have no round number
    const loc = cellAt(row, location);
    const dateText = textAt(row, date);
    rounds.push({
      round,
      name,
      eventArticle: cellAt(row, race)?.links[0]?.title ?? null,
      circuit: namedCell(cellAt(row, circuit)),
      location: loc ? orNull(loc.text) : null,
      country: loc?.flags[0] ?? cellAt(row, race)?.flags[0] ?? null,
      dateText,
      ...parseDates(dateText, seasonId),
    });
  }
  return { rounds, cancelled };
}

// ---------- Season: class winners ----------

const WINNER_COL = /\s*(winners?|winning\s+(team|drivers?|car))\s*$/i;

function isWinnersTable(t: WikiTable): boolean {
  return columnIndex(t, /^(Rnd|Round)/i) === 0 && t.columns.some((c) => WINNER_COL.test(c));
}

function parseWinners(doc: Document): {
  classes: string[];
  byRound: Map<number, { report: string | null; winners: ClassWinner[] }>;
} {
  const byRound = new Map<number, { report: string | null; winners: ClassWinner[] }>();
  const table = wikiTables(doc).find(isWinnersTable);
  if (!table) return { classes: [], byRound };
  const report = columnIndex(table, /Report|Results/i);
  const classCols = table.columns
    .map((c, i) => ({ cls: normalizeClass(c.replace(WINNER_COL, '')), i }))
    .filter(({ i }) => WINNER_COL.test(table.columns[i]));

  for (const group of groupRows(table.rows, 0)) {
    const round = intOf(textAt(group[0], 0));
    if (round === null) continue;
    const winners: ClassWinner[] = [];
    for (const { cls, i } of classCols) {
      const teamCell = cellAt(group[0], i);
      if (!teamCell?.text) continue;
      const driverCell = group.map((r) => cellAt(r, i)).find((c) => c && c.el !== teamCell.el);
      const number = /No\.\s*(\d+)/i.exec(teamCell.text)?.[1] ?? null;
      const team = namedCell(teamCell);
      winners.push({
        cls,
        number,
        team: team && { ...team, name: team.name.replace(/^No\.\s*\d+\s*/i, '') },
        drivers: (driverCell?.lines ?? []).map(named).filter((x): x is Named => x !== null),
      });
    }
    byRound.set(round, { report: cellAt(group[0], report)?.links[0]?.title ?? null, winners });
  }
  return { classes: classCols.map((c) => c.cls), byRound };
}

// ---------- Season: standings ----------

const TONES: Record<string, ResultTone> = {
  '#ffffbf': 'gold',
  '#dfdfdf': 'silver',
  '#ffdf9f': 'bronze',
  '#dfffdf': 'points',
  '#cfcfff': 'nopoints',
  '#efcfff': 'retired',
  '#000000': 'excluded',
  '#ffffff': 'dns',
  '#ffcfcf': 'withdrawn',
};

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'table'
  );
}

function kindOf(nameHeader: string, title: string): StandingKind {
  if (/driver/i.test(nameHeader)) return 'drivers';
  if (/manufacturer/i.test(nameHeader)) return 'manufacturers';
  if (/driver/i.test(title)) return 'drivers';
  if (/manufacturer/i.test(title)) return 'manufacturers';
  return 'teams';
}

function isStandings(t: WikiTable): boolean {
  return /^Pos/i.test(t.columns[0] ?? '') && /points/i.test(t.columns[t.columns.length - 1] ?? '');
}

export function parseStandings(doc: Document, tables = wikiTables(doc)): StandingTable[] {
  const out: StandingTable[] = [];
  const used = new Set<string>();
  for (const table of tables.filter(isStandings)) {
    const last = table.columns.length - 1;
    const roundCols = table.columns
      .map((_, i) => i)
      .filter((i) => i > 1 && i < last && table.head.some((r) => (r[i]?.links.length ?? 0) > 0));
    if (roundCols.length === 0) continue;
    const extraCols = table.columns.map((_, i) => i).filter((i) => i > 1 && i < roundCols[0]);
    const extra = extraCols[extraCols.length - 1] ?? -1;
    const title = table.heading ?? 'Зачёт';
    const carFirst = /^(Car|No)/i.test(table.columns[1] ?? '');
    let id = slug(title);
    for (let n = 2; used.has(id); n++) id = `${slug(title)}-${n}`;
    used.add(id);

    const rows: StandingRow[] = [];
    for (const posGroup of groupRows(table.rows, 0)) {
      const posText = textAt(posGroup[0], 0);
      if (!posText || /source|note/i.test(posText)) continue;
      // Co-drivers can share one position cell; each name is its own entry.
      for (const group of groupRows(posGroup, 1)) {
        // Team trophies list the car number first and the team next to it.
        const byCar = carFirst && extra >= 0;
        const name = namedCell(cellAt(group[0], byCar ? extra : 1));
        if (!name) continue;
        const points = textAt(group[0], last);
        const extraText = extra >= 0 ? orNull(textAt(group[0], byCar ? 1 : extra)) : null;
        rows.push({
          pos: intOf(posText),
          posText,
          name,
          extra: byCar && extraText ? `№ ${extraText}` : extraText,
          lines: group.map((row) =>
            roundCols.map((i) => {
              const c = cellAt(row, i);
              return { text: c?.text ?? '', tone: c?.bg ? (TONES[c.bg] ?? null) : null };
            }),
          ),
          points,
          pointsValue: /^-?\d+(?:\.\d+)?/.test(points) ? parseFloat(points) : null,
        });
      }
    }
    if (rows.length === 0) continue;
    const nameHeader = (carFirst && extra >= 0 ? table.columns[extra] : table.columns[1]) ?? '';
    out.push({
      id,
      title,
      kind: kindOf(nameHeader, title),
      nameHeader,
      extraHeader: extra >= 0 ? (carFirst ? 'Машина' : table.columns[extra]) : null,
      rounds: roundCols.map((i) => {
        const head = table.head.map((r) => r[i]).find((c) => c && c.links.length > 0);
        return { abbr: head?.text || table.columns[i], report: head?.links[0]?.title ?? null };
      }),
      rows,
    });
  }
  return out;
}

/** The season from the HTML of its "Calendar/Schedule" and "Results and standings" sections. */
export function parseSeason(
  id: string,
  article: string,
  calendarHtml: string,
  resultsHtml: string,
): WecSeasonData {
  const cal = parseCalendar(parseHtml(calendarHtml), id);
  const resultsDoc = parseHtml(resultsHtml);
  const { classes, byRound } = parseWinners(resultsDoc);
  return {
    id,
    article,
    rounds: cal.rounds.map((r) => ({
      ...r,
      report: byRound.get(r.round)?.report ?? null,
      winners: byRound.get(r.round)?.winners ?? [],
    })),
    cancelled: cal.cancelled,
    classes,
    standings: parseStandings(resultsDoc),
  };
}

// ---------- Race article ----------

function isClassification(t: WikiTable): boolean {
  return (
    /^Pos/i.test(t.columns[0] ?? '') &&
    columnIndex(t, /^Class/i) > 0 &&
    columnIndex(t, /Laps/i) > 0 &&
    columnIndex(t, /Team|Entrant/i) > 0
  );
}

function parseClassification(tables: WikiTable[]): RaceEntry[] {
  const table = tables.find(isClassification);
  if (!table) return [];
  const col = (re: RegExp) => columnIndex(table, re);
  const [cls, no, team, drivers, chassis, tyre, laps, time] = [
    col(/^Class/i),
    col(/^No/i),
    col(/Team|Entrant/i),
    col(/Driver/i),
    col(/Chassis|Car/i),
    col(/Tyre|Tire/i),
    col(/Laps/i),
    col(/Time|Reason|Retired|Gap/i),
  ];
  const out: RaceEntry[] = [];
  for (const group of groupRows(table.rows, 0)) {
    const first = group[0];
    const posText = stripMarks(textAt(first, 0));
    const clsText = normalizeClass(textAt(first, cls));
    // Footer rows ("Official results", "Source") span the whole table.
    if (!posText || !clsText || cellAt(first, 0)?.el === cellAt(first, cls)?.el) continue;
    const chassisCells = group.map((r) => cellAt(r, chassis)).filter((c): c is WikiCell => !!c);
    const engineCell = chassisCells.find((c) => c.el !== chassisCells[0]?.el);
    out.push({
      pos: intOf(posText),
      posText,
      cls: clsText,
      number: orNull(stripMarks(textAt(first, no))),
      team: namedCell(cellAt(first, team)),
      drivers: (cellAt(first, drivers)?.lines ?? []).map(named).filter((x): x is Named => x !== null),
      chassis: chassisCells[0] ? orNull(chassisCells[0].text) : null,
      engine: engineCell ? orNull(engineCell.text) : null,
      tyre: orNull(textAt(first, tyre)),
      laps: intOf(textAt(first, laps)),
      time: orNull(stripMarks(textAt(first, time))),
    });
  }
  return out;
}

const TIME_COL = /^(Lap|Time|Gap|Qualifying|Hyperpole|Q\d|Session|Best)/i;

function isQualifying(t: WikiTable): boolean {
  return (
    /^Pos/i.test(t.columns[0] ?? '') &&
    columnIndex(t, /Laps/i) < 0 &&
    t.columns.some((c) => TIME_COL.test(c)) &&
    /qualif|hyperpole/i.test(t.heading ?? '')
  );
}

function parseQualifying(tables: WikiTable[]): QualifyingTable | null {
  const found = tables.filter(isQualifying);
  if (found.length === 0) return null;
  const first = found[0];
  const timeColumns = first.columns.filter((c) => TIME_COL.test(c));
  const rows: QualifyingTable['rows'] = [];
  for (const table of found) {
    const col = (re: RegExp) => columnIndex(table, re);
    const [cls, no, team, driver, grid] = [
      col(/^Class/i),
      col(/^No/i),
      col(/Team|Entrant/i),
      col(/Driver/i),
      col(/Grid/i),
    ];
    const times = table.columns.map((c, i) => (TIME_COL.test(c) ? i : -1)).filter((i) => i >= 0);
    for (const group of groupRows(table.rows, 0)) {
      const row = group[0];
      const posText = textAt(row, 0);
      if (!posText || /source/i.test(posText) || cellAt(row, 0)?.el === cellAt(row, 1)?.el) continue;
      rows.push({
        pos: intOf(posText),
        posText,
        cls: cls >= 0 ? orNull(normalizeClass(textAt(row, cls))) : null,
        number: no >= 0 ? orNull(textAt(row, no)) : null,
        team: namedCell(cellAt(row, team)),
        driver: namedCell(cellAt(row, driver)),
        times: times.map((i) => textAt(row, i)),
        grid: grid >= 0 ? orNull(textAt(row, grid)) : null,
      });
    }
  }
  return rows.length ? { timeColumns, rows } : null;
}

function isPractice(t: WikiTable): boolean {
  return (
    /practice|test/i.test(t.heading ?? '') &&
    /^Class/i.test(t.columns[0] ?? '') &&
    columnIndex(t, /Time/i) > 0
  );
}

function parsePractice(tables: WikiTable[]): PracticeSession[] {
  return tables.filter(isPractice).map((table) => {
    const col = (re: RegExp) => columnIndex(table, re);
    const [no, team, driver, time] = [col(/^No/i), col(/Team|Entrant/i), col(/Driver/i), col(/Time/i)];
    return {
      title: table.heading ?? 'Тренировка',
      rows: table.rows
        .filter((r) => r[0]?.header && r[0].el !== r[1]?.el && !/source/i.test(r[0].text))
        .map((r) => ({
          cls: normalizeClass(textAt(r, 0)),
          number: no >= 0 ? orNull(textAt(r, no)) : null,
          team: namedCell(cellAt(r, team)),
          driver: namedCell(cellAt(r, driver)),
          time: orNull(textAt(r, time)),
        })),
    };
  });
}

export function parseRace(article: string, html: string): WecRaceData {
  const tables = wikiTables(parseHtml(html));
  return {
    article,
    classification: parseClassification(tables),
    qualifying: parseQualifying(tables),
    practice: parsePractice(tables).filter((s) => s.rows.length > 0),
  };
}

/** Classes in order of first appearance in a classification. */
export function classesOf(entries: Array<{ cls: string | null }>): string[] {
  const seen: string[] = [];
  for (const e of entries) if (e.cls && !seen.includes(e.cls)) seen.push(e.cls);
  return seen;
}
