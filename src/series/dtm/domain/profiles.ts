// DTM profile from one Wikipedia article: infobox, lead and "Complete DTM results" tables.
import { parseSeriesProfile, type SeriesProfile, type SeriesProfileKind } from '../../../lib/wikiProfile';
import { parseHtml } from '../../../lib/wikitable';

export function parseDtmProfile(article: string, html: string, kind: SeriesProfileKind): SeriesProfile {
  return parseSeriesProfile(article, parseHtml(html), kind, {
    career: /^(DTM|Deutsche Tourenwagen Masters) career$/i,
    // Drivers: "Complete Deutsche Tourenwagen Masters results"; teams: a "Deutsche Tourenwagen Masters" section.
    results: /^(Complete )?(Deutsche Tourenwagen Masters|DTM)( results)?$/i,
    layout: /Grand Prix|Full|Circuit|Course/i,
  });
}
