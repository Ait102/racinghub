// IMSA entry list ("Entries"): one table per class, GT Daytona split into GTD Pro and GTD rows.
import { entryRows, groupCrews, type Crew } from '../../../lib/wikiEntries';
import { parseHtml, wikiTables } from '../../../lib/wikitable';
import { classCode, headingPath } from './season';

export function parseImsaEntries(html: string): Crew[] {
  const rows = entryRows(wikiTables(parseHtml(html)));
  return groupCrews(rows, (row) => {
    if (row.section) return classCode(row.section) ?? row.section;
    // "Grand Touring Prototype (GTP)" → GTP; the nearest heading that names a class.
    return [...headingPath(row.table.el)].reverse().map(classCode).find(Boolean) ?? null;
  });
}
