// Formula E profile from one Wikipedia article: infobox facts (as the source counts them),
// the lead paragraph and the "Complete Formula E results" / E-Prix "Results" tables.
import { infoboxPhotoFiles } from '../../../api/wikimedia';
import {
  infoboxFacts,
  leadBiography,
  sectionTables,
  type Fact,
  type ProfileTable,
} from '../../../lib/wikiProfile';
import { parseHtml } from '../../../lib/wikitable';
import { isPastSeason } from '../data/seasons';

export type FeProfileKind = 'driver' | 'team' | 'eprix';
export type FeProfileTable = ProfileTable<'fe' | 'winners'>;
export interface FeProfile {
  article: string;
  photoFiles: string[];
  facts: Fact[];
  biography: string | null;
  tables: FeProfileTable[];
}

const PERSON: Record<string, string> = {
  Born: 'Родился',
  'Full name': 'Полное имя',
  Nationality: 'Национальность',
};
// The infobox's own Formula E figures: shown as published, never recounted.
const FE_CAREER: Record<string, string> = {
  'Debut season': 'Дебют в FE',
  'Current team': 'Команда',
  'Car number': 'Номер',
  'Former teams': 'Прежние команды',
  Starts: 'Старты',
  Championships: 'Титулы',
  Wins: 'Победы',
  Podiums: 'Подиумы',
  Poles: 'Поулы',
  'Fastest laps': 'Быстрые круги',
  'Finished last season': 'Итог прошлого сезона',
};
const TEAM: Record<string, string> = {
  Founded: 'Основана',
  Base: 'База',
  'Team principal(s)': 'Руководитель',
  Races: 'Гонки',
  Wins: 'Победы',
  Podiums: 'Подиумы',
  Poles: 'Поулы',
  "Teams' Championships": 'Командные титулы',
  'First entry': 'Первый старт',
  'First win': 'Первая победа',
};
const EPRIX: Record<string, string> = {
  'Number of times held': 'Проводилась',
  'First held': 'Впервые',
  'Most wins (drivers)': 'Больше всех побед (пилоты)',
  'Most wins (constructors)': 'Больше всех побед (производители)',
  'Circuit length': 'Длина круга',
};

const factLabels = (kind: FeProfileKind) => (section: string) =>
  kind === 'team'
    ? TEAM
    : kind === 'eprix'
      ? EPRIX
      : /^Formula E career$/i.test(section)
        ? FE_CAREER
        : /career$/i.test(section)
          ? {} // other series' figures (F1, DTM…) are not Formula E facts
          : PERSON;

export function parseFeProfile(article: string, html: string, kind: FeProfileKind): FeProfile {
  const doc = parseHtml(html);
  return {
    article,
    photoFiles: infoboxPhotoFiles(doc),
    facts: infoboxFacts(doc, factLabels(kind)),
    biography: leadBiography(doc),
    tables: sectionTables<FeProfileTable['kind']>(doc, (title) =>
      kind === 'eprix'
        ? /^(Results|Winners)$/i.test(title)
          ? 'winners'
          : null
        : /Formula E.*results/i.test(title)
          ? 'fe'
          : null,
    ),
  };
}

const POS = /^(Pos\.?|Position|DC|T\.?C\.?|Rank)$/i;
const POINTS = /^(Points|Pts\.?)$/i;

/** Season-level columns of a results table (the per-race columns stay in the source). */
export function summaryColumns(table: FeProfileTable): number[] {
  if (table.kind === 'winners') return table.columns.map((_, i) => i);
  return table.columns
    .map((name, i) =>
      /^(Year|Season|Team|Chassis|Powertrain)$/i.test(name) || POS.test(name) || POINTS.test(name) ? i : -1,
    )
    .filter((i) => i >= 0);
}

/**
 * Rows of the summary view: a team lists every driver under one season (rowspan), so rows
 * whose season-level cells repeat the previous row are the same season, shown once.
 */
export function summaryRows(table: FeProfileTable): FeProfileTable['rows'] {
  const cols = summaryColumns(table);
  const seen = new Set<string>();
  return table.rows.filter((row) => {
    const key = cols.map((i) => row.cells[i]?.text ?? '').join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Season results of one profile: position and points as published, one entry per source row. */
export function seasonResults(
  profile: FeProfile,
): Array<{ season: string; team: string | null; position: string | null; points: string | null }> {
  const out = [];
  for (const table of profile.tables.filter((t) => t.kind === 'fe')) {
    const col = (re: RegExp) => table.columns.findIndex((c) => re.test(c));
    const team = col(/^Team$/i);
    const position = table.columns.findIndex((c) => POS.test(c));
    const points = col(POINTS);
    for (const row of summaryRows(table)) {
      const text = (i: number) => (i >= 0 && row.cells[i]?.text) || null;
      out.push({ season: row.season, team: text(team), position: text(position), points: text(points) });
    }
  }
  return out;
}

/** Seasons in the results table and titles = 1st place in a finished season (null if unknowable). */
export function feProfileStats(profile: FeProfile, now = new Date()) {
  const rows = seasonResults(profile);
  const seasons = new Set(rows.map((r) => r.season));
  const finished = rows.filter((r) => isPastSeason(r.season, now));
  const titlesKnown = finished.every((r) => r.position && !/^(—|-|N\/A)$/i.test(r.position));
  const titles = new Set(finished.filter((r) => /^1(?:st)?$/.test(r.position ?? '')).map((r) => r.season));
  return { seasons: seasons.size, titles: seasons.size && titlesKnown ? titles.size : null };
}
