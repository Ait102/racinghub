import { columnIndex, parseHtml, wikiTables, type WikiLine } from '../../../lib/wikitable';
import { normalizeClass } from './parse';
import type { Named } from './types';

export interface Participant {
  who: Named;
  categories: string[];
  /** Cars entered, from the "Car" column (model name and its article). */
  cars: Named[];
  crews: EntryCrew[];
}

export interface EntryCrew {
  number: string;
  category: string;
  entrant: Named;
  car: Named | null;
  drivers: { who: Named; rounds: string | null }[];
}

function entryName(line: WikiLine): Named | null {
  const name = line.link?.text || line.text;
  if (!name || /^(TBA|TBC|TBD|—|-)$/i.test(name)) return null;
  return { name, article: line.link?.title ?? null, flag: line.flag };
}

/** Entry lists work before standings exist, including substitute and guest drivers. */
export function parseParticipants(html: string, drivers: boolean): Participant[] {
  const entries = new Map<string, Participant>();
  const crews = new Map<string, EntryCrew>();
  for (const table of wikiTables(parseHtml(html))) {
    const team = columnIndex(table, /Entrant|Team/i);
    const driver = columnIndex(table, /^Drivers?$/i);
    const car = columnIndex(table, /^(Car|Chassis)$/i);
    const number = columnIndex(table, /^(?:No\.?|Number|Car number|#)$/i);
    const rounds = columnIndex(table, /^Rounds?$/i);
    if (team < 0 || driver < 0) continue;
    const index = drivers ? driver : team;
    const cls = normalizeClass(table.heading ?? 'Класс не указан');
    for (const row of table.rows) {
      const cell = row[index];
      if (!cell || cell.header || row[team]?.el === row[driver]?.el) continue;
      const carLine = car >= 0 ? row[car]?.lines[0] : undefined;
      const carName = carLine?.text ?? '';
      const model = carName ? { name: carName, article: carLine?.link?.title ?? null, flag: null } : null;
      const carNumber = row[number]?.text ?? '';
      const entrant = row[team]?.lines.map(entryName).find((name) => name !== null);
      let crew: EntryCrew | undefined;
      if (entrant && /^\d+$/.test(carNumber)) {
        const key = JSON.stringify([cls, entrant.name, entrant.article, carNumber, carName]);
        crew = crews.get(key) ?? { number: carNumber, category: cls, entrant, car: model, drivers: [] };
        crews.set(key, crew);
        const participation = row[rounds]?.text || null;
        for (const line of row[driver]?.lines ?? []) {
          const who = entryName(line);
          if (
            who &&
            !crew.drivers.some(
              (d) =>
                (d.who.article ?? d.who.name) === (who.article ?? who.name) && d.rounds === participation,
            )
          ) {
            crew.drivers.push({ who, rounds: participation });
          }
        }
      }
      for (const line of cell.lines) {
        const who = entryName(line);
        if (!who) continue;
        const key = who.article ?? who.name;
        const entry = entries.get(key) ?? { who, categories: [], cars: [], crews: [] };
        if (!entry.categories.includes(cls)) entry.categories.push(cls);
        if (model && !entry.cars.some((c) => c.name === carName)) entry.cars.push(model);
        if (crew && !entry.crews.includes(crew)) entry.crews.push(crew);
        entries.set(key, entry);
      }
    }
  }
  return [...entries.values()];
}
