// Entry lists of season articles ("Entries", "Teams and drivers"): a row per driver, the team,
// car and number spanning the rows of one crew. Read as published; nothing is merged across cars.
import type { Named } from './wikiStandings';
import { columnIndex, type WikiCell, type WikiLine, type WikiTable } from './wikitable';

export interface EntryRow {
  team: Named | null;
  manufacturer: string;
  /** Chassis or car model as the table names it. */
  car: string;
  engine: string;
  number: string;
  driver: Named;
  /** Rookie / guest marks and the like ("R", "G"), as published. */
  status: string;
  rounds: string;
  /** Text of the last separator row above (e.g. "GTD Pro" inside the GT Daytona table). */
  section: string | null;
  table: WikiTable;
}

export interface Crew {
  /** Class code or null when the series has one class. */
  cls: string | null;
  number: string;
  team: Named | null;
  manufacturer: string;
  car: string;
  engine: string;
  drivers: Array<{ driver: Named; rounds: string; status: string }>;
}

const EMPTY = /^(TBA|TBC|TBD|—|-|)$/i;

const lineNamed = (line: WikiLine | undefined): Named | null => {
  const name = (line?.link?.text || line?.text || '').trim();
  return line && !EMPTY.test(name) ? { name, article: line.link?.title ?? null, flag: line.flag } : null;
};

const cellNamed = (cell: WikiCell | undefined): Named | null =>
  cell?.lines.map(lineNamed).find((n): n is Named => n !== null) ?? null;

const text = (cell: WikiCell | undefined) => cell?.text.trim() ?? '';

/** Rows of every table with a team, a number and a driver column. */
export function entryRows(tables: WikiTable[]): EntryRow[] {
  const out: EntryRow[] = [];
  for (const table of tables) {
    const col = (re: RegExp) => columnIndex(table, re);
    const team = col(/^(Team|Entrant)/i);
    // A spanning sub-heading right under the header ("GTD Pro") joins the column names: "No. / GTD Pro".
    const driver = col(/^Drivers?( \/|$)/i);
    const number = col(/^No\.?( \/|$)/i);
    if (team < 0 || driver < 0 || number < 0) continue;
    const [maker, car, engine, status, rounds] = [
      col(/^Manufacturer/i),
      col(/^(Chassis|Car)( \/|$)/i),
      col(/^Engine/i),
      col(/^Status/i),
      col(/^Rounds?/i),
    ];
    const at = (row: WikiCell[], i: number) => (i >= 0 ? row[i] : undefined);
    const spanning = (row: WikiCell[]) => row.length > 1 && row.every((cell) => cell?.el === row[0]?.el);
    let section: string | null = text([...table.head].reverse().find(spanning)?.[0]) || null;
    for (const row of table.rows) {
      // A row spanning the whole table is a heading inside it ("GTD Pro", "GTD").
      if (spanning(row)) {
        section = text(row[0]) || null;
        continue;
      }
      const who = lineNamed(row[driver]?.lines.find((l) => l.text.trim()));
      if (!who) continue;
      out.push({
        team: cellNamed(row[team]),
        manufacturer: text(at(row, maker)),
        car: text(at(row, car)),
        engine: text(at(row, engine)),
        number: text(row[number]),
        driver: who,
        status: text(at(row, status)),
        rounds: text(at(row, rounds)),
        section,
        table,
      });
    }
  }
  return out;
}

/** Crews: the drivers of one car, keyed by class, team and number in the order of the source. */
export function groupCrews(rows: EntryRow[], clsOf: (row: EntryRow) => string | null = () => null): Crew[] {
  const crews = new Map<string, Crew>();
  for (const row of rows) {
    const cls = clsOf(row);
    const key = `${cls}|${row.team?.name}|${row.number}`;
    let crew = crews.get(key);
    if (!crew) {
      crew = {
        cls,
        number: row.number,
        team: row.team,
        manufacturer: row.manufacturer,
        car: row.car,
        engine: row.engine,
        drivers: [],
      };
      crews.set(key, crew);
    }
    if (!crew.drivers.some((d) => d.driver.name === row.driver.name))
      crew.drivers.push({ driver: row.driver, rounds: row.rounds, status: row.status });
  }
  return [...crews.values()];
}

export interface EntryDriver {
  driver: Named;
  seats: Array<Omit<Crew, 'drivers'> & { rounds: string; status: string }>;
}

/** Every driver once, with each car they were entered in. */
export function entryDrivers(crews: Crew[]): EntryDriver[] {
  const drivers = new Map<string, EntryDriver>();
  for (const crew of crews) {
    const { drivers: list, ...seat } = crew;
    for (const { driver, rounds, status } of list) {
      const key = driver.article ?? driver.name;
      const entry = drivers.get(key) ?? { driver, seats: [] };
      entry.seats.push({ ...seat, rounds, status });
      drivers.set(key, entry);
    }
  }
  return [...drivers.values()];
}
