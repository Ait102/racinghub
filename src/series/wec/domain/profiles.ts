import { infoboxPhotoFiles } from '../../../api/wikimedia';
import {
  infoboxFacts,
  leadBiography,
  sectionTables,
  type Fact,
  type ProfileTable as SharedTable,
} from '../../../lib/wikiProfile';
import { parseHtml, wikiTables } from '../../../lib/wikitable';
import { isPastSeason } from '../data/seasons';
import { normalizeClass, parseStandings } from './parse';
import type { Participant } from './participants';
import type { Named, StandingTable } from './types';

export type ProfileKind = 'driver' | 'team' | 'circuit';
export type { ProfileCell, ProfileRow } from '../../../lib/wikiProfile';
export type ProfileTable = SharedTable<'wec' | 'lemans' | 'winners'>;
export interface WecProfile {
  article: string;
  photoFiles: string[];
  facts: Fact[];
  biography: string | null;
  tables: ProfileTable[];
  standings: StandingTable[];
}

const DRIVER_LABELS: Record<string, string> = {
  Born: 'Родился',
  'Full name': 'Полное имя',
  'Birth name': 'Имя при рождении',
  Nationality: 'Национальность',
  'Racing licence': 'Гоночная лицензия',
};
const WEC_LABELS: Record<string, string> = {
  'Debut season': 'Дебют в WEC',
  'Current team': 'Команда в WEC',
  Categorisation: 'Категория FIA',
  'Car number': 'Номер в WEC',
};

/** A team may appear under both the requested and canonical article titles. */
export function teamCars(
  participants: Pick<Participant, 'who' | 'cars' | 'categories'>[],
  articles: readonly string[],
): Named[] {
  const cars = new Map<string, Named>();
  for (const entry of participants) {
    if (!entry.who.article || !articles.includes(entry.who.article)) continue;
    for (const car of entry.cars) {
      const key = car.name;
      if (!cars.has(key)) cars.set(key, car);
    }
  }
  return [...cars.values()];
}

export { validArticle } from '../../../lib/wikiArticle';

/** Only the relevant results section; headings for other series never qualify. */
export function parseProfile(article: string, html: string, kind: ProfileKind): WecProfile {
  const doc = parseHtml(html);
  const parsedTables = wikiTables(doc);
  const tables = sectionTables<ProfileTable['kind']>(
    doc,
    (title) =>
      kind === 'circuit'
        ? /^Winners$/i.test(title)
          ? 'winners'
          : null
        : /World Endurance Championship.*(results|record)/i.test(title)
          ? 'wec'
          : /24 Hours of Le Mans.*results/i.test(title)
            ? 'lemans'
            : null,
    (column, text) => (/^Class$/i.test(column) ? normalizeClass(text) : text),
    parsedTables,
  );
  return {
    article,
    photoFiles: infoboxPhotoFiles(doc),
    facts:
      kind === 'driver'
        ? infoboxFacts(doc, (section) =>
            /World Endurance Championship/i.test(section)
              ? { ...DRIVER_LABELS, ...WEC_LABELS }
              : DRIVER_LABELS,
          )
        : [],
    biography: kind === 'driver' ? leadBiography(doc) : null,
    tables,
    standings:
      kind === 'team' ? parseStandings(doc, parsedTables).filter((t) => /endurance|WEC/i.test(t.title)) : [],
  };
}

export function profileStats(profile: WecProfile, now = new Date()) {
  const seasons = new Set<string>();
  const titles = new Set<string>();
  const leMansWins = new Set<string>();
  const leMansPodiums = new Set<string>();
  let hasClass = false;
  let titlesKnown = true;
  for (const table of profile.tables) {
    const pos = table.columns.findIndex((c) => /^(Rank|Pos\.?|Position|DC)$/i.test(c));
    const cls = table.columns.findIndex((c) => /^Class\s*Pos\.?$/i.test(c.replace(/\s/g, '')));
    for (const row of table.rows) {
      if (table.kind === 'wec') {
        seasons.add(row.season);
        if (
          isPastSeason(row.season, now) &&
          (pos < 0 || !row.cells[pos].text || /^(—|-|N\/A)$/i.test(row.cells[pos].text))
        )
          titlesKnown = false;
        if (pos >= 0 && /^1(?:st)?$/.test(row.cells[pos].text) && isPastSeason(row.season, now))
          titles.add(row.season);
      }
      if (table.kind === 'lemans' && cls >= 0) {
        hasClass = true;
        const place = /^([1-3])(?:st|nd|rd)?$/.exec(row.cells[cls].text);
        if (place) leMansPodiums.add(row.season);
        if (place?.[1] === '1') leMansWins.add(row.season);
      }
    }
  }
  return {
    seasons: seasons.size,
    titles: seasons.size && titlesKnown ? titles.size : null,
    leMansWins: hasClass ? leMansWins.size : null,
    leMansPodiums: hasClass ? leMansPodiums.size : null,
  };
}
