// IMSA profile from one Wikipedia article: infobox, lead and the IMSA results tables
// (the championship was also called United SportsCar and WeatherTech SportsCar Championship).
import { parseSeriesProfile, type SeriesProfile, type SeriesProfileKind } from '../../../lib/wikiProfile';
import { parseHtml } from '../../../lib/wikitable';

const SERIES = '(IMSA|WeatherTech|United) Sports ?Car Championship';

export function parseImsaProfile(article: string, html: string, kind: SeriesProfileKind): SeriesProfile {
  return parseSeriesProfile(article, parseHtml(html), kind, {
    career: new RegExp(`^${SERIES} career$`, 'i'),
    results: new RegExp(`^(Complete )?${SERIES}( results)?$`, 'i'),
    layout: /Sports Car Course|Road Course|Grand Prix|Full Circuit/i,
  });
}
