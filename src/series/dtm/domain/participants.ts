// DTM entry list ("Teams and drivers"): a row per driver; one class.
import { entryRows, groupCrews, type Crew } from '../../../lib/wikiEntries';
import { parseHtml, wikiTables } from '../../../lib/wikitable';

export function parseDtmEntries(html: string): Crew[] {
  return groupCrews(entryRows(wikiTables(parseHtml(html))));
}
