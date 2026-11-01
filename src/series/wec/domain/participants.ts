import { columnIndex, parseHtml, wikiTables } from '../../../lib/wikitable';
import { normalizeClass } from './parse';
import type { Named } from './types';

export interface Participant {
  who: Named;
  categories: string[];
}

/** Entry lists work before standings exist, including substitute and guest drivers. */
export function parseParticipants(html: string, drivers: boolean): Participant[] {
  const entries = new Map<string, Participant>();
  for (const table of wikiTables(parseHtml(html))) {
    const team = columnIndex(table, /Entrant|Team/i);
    const driver = columnIndex(table, /^Drivers?$/i);
    if (team < 0 || driver < 0) continue;
    const index = drivers ? driver : team;
    for (const row of table.rows) {
      const cell = row[index];
      if (!cell || cell.header || row[team]?.el === row[driver]?.el) continue;
      for (const line of cell.lines) {
        const name = line.link?.text || line.text;
        if (!name || /^(TBA|TBC|—|-)$/i.test(name)) continue;
        const who: Named = { name, article: line.link?.title ?? null, flag: line.flag };
        const key = who.article ?? name;
        const entry = entries.get(key) ?? { who, categories: [] };
        const cls = normalizeClass(table.heading ?? 'Класс не указан');
        if (!entry.categories.includes(cls)) entry.categories.push(cls);
        entries.set(key, entry);
      }
    }
  }
  return [...entries.values()];
}
