import { columnIndex, parseHtml, wikiTables } from '../../../lib/wikitable';
import { normalizeClass } from './parse';
import type { Named } from './types';

export interface Participant {
  who: Named;
  categories: string[];
  /** Cars entered, from the "Car" column (model name and its article). */
  cars: Named[];
}

/** Entry lists work before standings exist, including substitute and guest drivers. */
export function parseParticipants(html: string, drivers: boolean): Participant[] {
  const entries = new Map<string, Participant>();
  for (const table of wikiTables(parseHtml(html))) {
    const team = columnIndex(table, /Entrant|Team/i);
    const driver = columnIndex(table, /^Drivers?$/i);
    const car = columnIndex(table, /^(Car|Chassis)$/i);
    if (team < 0 || driver < 0) continue;
    const index = drivers ? driver : team;
    for (const row of table.rows) {
      const cell = row[index];
      if (!cell || cell.header || row[team]?.el === row[driver]?.el) continue;
      const carLine = car >= 0 ? row[car]?.lines[0] : undefined;
      const carName = carLine?.text ?? '';
      for (const line of cell.lines) {
        const name = line.link?.text || line.text;
        if (!name || /^(TBA|TBC|—|-)$/i.test(name)) continue;
        const who: Named = { name, article: line.link?.title ?? null, flag: line.flag };
        const key = who.article ?? name;
        const entry = entries.get(key) ?? { who, categories: [], cars: [] };
        const cls = normalizeClass(table.heading ?? 'Класс не указан');
        if (!entry.categories.includes(cls)) entry.categories.push(cls);
        if (carName && !entry.cars.some((c) => c.name === carName)) {
          entry.cars.push({ name: carName, article: carLine?.link?.title ?? null, flag: null });
        }
        entries.set(key, entry);
      }
    }
  }
  return [...entries.values()];
}
