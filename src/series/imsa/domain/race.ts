// Full classification of an IMSA race from its Wikipedia article ("Results" / "Race results").
// Each car takes two rows: chassis on the first, engine on the second. Values stay as published.
import type { Named } from '../../../lib/wikiStandings';
import { columnIndex, groupRows, parseHtml, wikiTables, type WikiCell } from '../../../lib/wikitable';

export interface ImsaResultRow {
  /** Position as published, e.g. "1", "27DNF" is split into pos 27 and status "DNF". */
  pos: number | null;
  posText: string;
  status: string | null;
  cls: string;
  /** Position in class, when the source gives it. */
  pic: string | null;
  number: string;
  team: Named | null;
  drivers: Named[];
  chassis: string;
  engine: string;
  laps: string;
  time: string;
}

export interface ImsaRaceData {
  title: string;
  rows: ImsaResultRow[];
}

const text = (cell: WikiCell | undefined) => cell?.text.trim() ?? '';

export function parseImsaRace(title: string, html: string): ImsaRaceData {
  const table = wikiTables(parseHtml(html)).find(
    (t) => /^Pos/i.test(t.columns[0] ?? '') && columnIndex(t, /^Class/i) > 0 && columnIndex(t, /^Laps/i) > 0,
  );
  if (!table) return { title, rows: [] };
  const col = (re: RegExp) => columnIndex(table, re);
  const [cls, pic, no, team, drivers, chassis, laps, time] = [
    col(/^Class/i),
    col(/^PIC/i),
    col(/^No/i),
    col(/^Team/i),
    col(/^Drivers?/i),
    col(/^Chassis/i),
    col(/^Laps/i),
    col(/^Time/i),
  ];
  const rows: ImsaResultRow[] = [];
  for (const group of groupRows(table.rows, 0)) {
    const first = group[0];
    // "Source:" footers and class separators span the whole row.
    if (!first[cls] || first[cls].el === first[0]?.el) continue;
    const posText = text(first[0]);
    const m = /^(\d+)\s*([A-Z]{2,4})?$/.exec(posText.replace(/\s+/g, ''));
    rows.push({
      pos: m ? Number(m[1]) : null,
      posText,
      status: m?.[2] ?? (m ? null : posText || null),
      cls: text(first[cls]),
      pic: pic >= 0 ? text(first[pic]) || null : null,
      number: text(first[no]),
      team: text(first[team])
        ? {
            name: text(first[team]),
            article: first[team].links[0]?.title ?? null,
            flag: first[team].flags[0] ?? null,
          }
        : null,
      drivers: (first[drivers]?.lines ?? [])
        .filter((line) => line.text.trim())
        .map((line) => ({
          name: (line.link?.text || line.text).trim(),
          article: line.link?.title ?? null,
          flag: line.flag,
        })),
      chassis: text(first[chassis]),
      engine: group[1] && group[1][chassis]?.el !== first[chassis]?.el ? text(group[1][chassis]) : '',
      laps: text(first[laps]),
      time: text(first[time]),
    });
  }
  return { title, rows };
}
