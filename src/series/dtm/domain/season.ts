// DTM season from its Wikipedia article: races (one or two per event), winners and standings.
// Everything comes from the source tables; nothing is recounted.
import { parseStandings, type Named, type ResultCell, type StandingTable } from '../../../lib/wikiStandings';
import {
  columnIndex,
  groupRows,
  parseHtml,
  wikiTables,
  type WikiCell,
  type WikiTable,
} from '../../../lib/wikitable';

export interface DtmRace {
  /** Race number in the season (R1, R2…), the order of the source tables. */
  index: number;
  /** Event (round) number. */
  round: number;
  /** Race 1 or 2 of a two-race event; null when the event had one race. */
  race: number | null;
  circuit: Named | null;
  dateText: string;
  /** ISO date when the text could be read. */
  date: string | null;
  pole: Named | null;
  fastestLap: Named | null;
  winner: Named | null;
  winningTeam: Named | null;
  winningManufacturer: Named | null;
  /** Note the source writes across the result columns, e.g. "Event cancelled due to monsoon conditions". */
  note: string | null;
}

export interface DtmSeasonData {
  id: string;
  article: string;
  races: DtmRace[];
  standings: StandingTable[];
  unavailable?: boolean;
}

const MONTHS = 'January February March April May June July August September October November December'.split(
  ' ',
);

/** "25 April" in season 2026 → "2026-04-25". */
export function parseDtmDate(text: string, year: string): string | null {
  const m = /(\d{1,2})\s+([A-Za-z]+)/.exec(text);
  const month = m ? MONTHS.indexOf(m[2][0].toUpperCase() + m[2].slice(1).toLowerCase()) : -1;
  if (!m || month < 0) return null;
  return `${year}-${String(month + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function named(cell: WikiCell | undefined): Named | null {
  const text = cell?.text.trim() ?? '';
  if (!cell || !text || /^(—|-|TBA|TBD|Cancelled)$/i.test(text)) return null;
  return { name: text, article: cell.links[0]?.title ?? null, flag: cell.flags[0] ?? null };
}

const isRound = (cell: WikiCell | undefined) => /^\d+$/.test(cell?.text.trim() ?? '');

/** Tables with a Round column and a Circuit column: the calendar, the summary or both in one. */
function roundTables(tables: WikiTable[]) {
  const withRound = tables.filter(
    (t) => /^R(ou)?nd\.?$|^Round$/i.test(t.columns[0] ?? '') && columnIndex(t, /^Circuit/i) > 0,
  );
  const winners = withRound.find((t) => columnIndex(t, /Winning driver/i) > 0);
  const calendar = withRound.find((t) => t !== winners) ?? winners;
  return { calendar, winners };
}

export function parseDtmSeason(id: string, article: string, html: string): DtmSeasonData {
  const doc = parseHtml(html);
  const tables = wikiTables(doc);
  const { calendar, winners } = roundTables(tables);
  const races: DtmRace[] = [];

  // Race rows: the winners table when there is one (a row per race), else the calendar.
  const source = winners ?? calendar;
  if (source) {
    const col = (re: RegExp) => columnIndex(source, re);
    const circuit = col(/^Circuit/i);
    const date = col(/^Date$/i);
    const [pole, fastest, winner, team, maker] = [
      col(/Pole/i),
      col(/Fastest/i),
      col(/Winning driver/i),
      col(/Winning team/i),
      col(/Winning manufacturer/i),
    ];
    const at = (row: WikiCell[], i: number) => (i >= 0 ? row[i] : undefined);
    for (const group of groupRows(source.rows, 0)) {
      if (!isRound(group[0][0])) continue;
      // A note row spanning the table ("Race cancelled") is not a race.
      const rows = group.filter((row) => row[0]?.el !== row[circuit]?.el);
      rows.forEach((row, i) => {
        // One cell spanning the winner columns is a note, not a winner.
        const spanned = winner >= 0 && row[winner]?.el === at(row, fastest)?.el;
        races.push({
          index: races.length + 1,
          round: Number(group[0][0].text.trim()),
          race: rows.length > 1 ? i + 1 : null,
          circuit: named(at(row, circuit)),
          dateText: date >= 0 ? (at(row, date)?.text ?? '') : '',
          date: null,
          pole: named(at(row, pole)),
          fastestLap: spanned ? null : named(at(row, fastest)),
          winner: spanned ? null : named(at(row, winner)),
          winningTeam: spanned ? null : named(at(row, team)),
          winningManufacturer: spanned ? null : named(at(row, maker)),
          note: spanned ? row[winner].text.trim() || null : null,
        });
      });
    }
  }

  // Dates: "Race 1" / "Race 2" columns of the modern calendar, or one Date per event.
  if (calendar) {
    const race1 = columnIndex(calendar, /^Race 1/i);
    const race2 = columnIndex(calendar, /^Race 2/i);
    const date = columnIndex(calendar, /^Date$/i);
    for (const group of groupRows(calendar.rows, 0)) {
      if (!isRound(group[0][0])) continue;
      const round = Number(group[0][0].text.trim());
      for (const race of races.filter((r) => r.round === round)) {
        const cell =
          race.race === 2 && race2 >= 0 ? group[0][race2] : race1 >= 0 ? group[0][race1] : group[0][date];
        if (cell && !race.dateText) race.dateText = cell.text;
      }
    }
  }
  for (const race of races) race.date = parseDtmDate(race.dateText, id);

  return { id, article, races, standings: dtmStandings(doc, tables) };
}

/** Standings with per-race columns, plus the totals-only tables of modern seasons (teams, makes). */
function dtmStandings(doc: Document, tables: WikiTable[]): StandingTable[] {
  const full = parseStandings(doc, tables, { series: 'fe' });
  const used = new Set(full.map((t) => t.title));
  for (const table of tables) {
    const points = columnIndex(table, /^(Points|Pts)\.?$/i);
    const title = table.heading ?? '';
    if (!/^Pos/i.test(table.columns[0] ?? '') || points !== 2 || used.has(title) || !title) continue;
    const rows = table.rows
      .filter((row) => /^\d+$/.test(row[0]?.text.trim() ?? '') && row[1])
      .map((row) => {
        const name = named(row[1])!;
        const pts = row[points]?.text ?? '';
        return {
          pos: Number(row[0].text.trim()),
          posText: row[0].text.trim(),
          name,
          extra: null,
          lines: [],
          points: pts,
          pointsValue: /^-?\d+(?:\.\d+)?/.test(pts) ? parseFloat(pts) : null,
        };
      })
      .filter((row) => row.name);
    if (!rows.length) continue;
    full.push({
      id: title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      title,
      kind: /manufacturer/i.test(table.columns[1] ?? '')
        ? 'manufacturers'
        : /driver/i.test(table.columns[1] ?? '')
          ? 'drivers'
          : 'teams',
      nameHeader: table.columns[1] ?? '',
      extraHeader: null,
      rounds: [],
      rows,
    });
  }
  return full;
}

/** Drivers' table with a column per race, if the source has one. */
export const driversTable = (data: DtmSeasonData) =>
  data.standings.find((t) => t.kind === 'drivers' && t.rounds.length > 0) ?? null;

/**
 * Column of a race in a standings table. Columns of one event share an abbreviation ("HOC1", "HOC1"),
 * so the k-th race of the n-th event is the k-th column of the n-th group. Null when the table does
 * not line up with the races (then nothing is guessed).
 */
export function raceColumn(data: DtmSeasonData, table: StandingTable, race: DtmRace): number | null {
  const groups: number[][] = [];
  table.rounds.forEach((r, i) => {
    const prev = table.rounds[i - 1];
    if (prev && prev.abbr === r.abbr && prev.report === r.report) groups.at(-1)!.push(i);
    else groups.push([i]);
  });
  const rounds = [...new Set(data.races.map((r) => r.round))];
  if (groups.length === rounds.length)
    return groups[rounds.indexOf(race.round)]?.[(race.race ?? 1) - 1] ?? null;
  return table.rounds.length === data.races.length ? race.index - 1 : null;
}

export interface DtmRaceResult {
  driver: Named;
  cell: ResultCell;
}

/** Every driver's result in one race, read from the drivers' standings column of that race. */
export function raceResults(data: DtmSeasonData, race: DtmRace): DtmRaceResult[] | null {
  const drivers = driversTable(data);
  const column = drivers && !race.note ? raceColumn(data, drivers, race) : null;
  if (!drivers || column === null) return null;
  return drivers.rows
    .map((row) => ({ driver: row.name, cell: row.lines[0]?.[column] }))
    .filter((r): r is DtmRaceResult => !!r.cell?.text)
    .sort((a, b) => (a.cell.place ?? Infinity) - (b.cell.place ?? Infinity));
}

export type DtmStatus = 'completed' | 'cancelled' | 'live' | 'upcoming' | 'awaiting' | 'unknown';
export const DTM_STATUS_LABELS: Record<DtmStatus, string> = {
  completed: 'Завершена',
  cancelled: 'Отменена',
  live: 'Сегодня',
  upcoming: 'Предстоящая',
  awaiting: 'Ждём результаты',
  unknown: 'Дата не указана',
};

const localDay = (now: Date) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

export function dtmRaceStatus(race: DtmRace, now: Date): DtmStatus {
  if (race.winner) return 'completed';
  if (race.note) return 'cancelled';
  if (!race.date) return 'unknown';
  const today = localDay(now);
  return today < race.date ? 'upcoming' : today === race.date ? 'live' : 'awaiting';
}

export const nextDtmRace = (races: DtmRace[], now: Date) =>
  races.find((race) => ['live', 'upcoming'].includes(dtmRaceStatus(race, now))) ?? null;

export const lastDtmRace = (races: DtmRace[]) => [...races].reverse().find((race) => race.winner) ?? null;

/** Whole days from today to the race date (calendar days, local time). */
export function daysUntilDtm(race: DtmRace, now: Date): number | null {
  if (!race.date) return null;
  const [y, m, d] = race.date.split('-').map(Number);
  return Math.round(
    (Date.UTC(y, m - 1, d) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86_400_000,
  );
}
