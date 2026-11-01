import { cleanText, columnIndex, parseHtml, wikiTables, type WikiCell } from '../../../lib/wikitable';
import { isPastSeason } from '../data/seasons';
import { normalizeClass, parseStandings } from './parse';
import type { Named, ResultTone, StandingTable } from './types';

export type ProfileKind = 'driver' | 'team' | 'circuit';
export interface ProfileCell {
  text: string;
  links: Named[];
  tone: ResultTone;
}
export interface ProfileRow {
  season: string;
  cells: ProfileCell[];
}
export interface ProfileTable {
  title: string;
  kind: 'wec' | 'lemans' | 'winners';
  columns: string[];
  rows: ProfileRow[];
}
export interface WecProfile {
  article: string;
  tables: ProfileTable[];
  standings: StandingTable[];
}

/** Article titles, not URLs or MediaWiki namespaces. */
export function validArticle(title: string): boolean {
  return (
    title.trim().length > 0 &&
    title.length <= 255 &&
    !/[:#<>[\]{}|]/.test(title) &&
    ![...title].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  );
}

const toneOf = (cell: WikiCell): ResultTone =>
  (
    ({
      '#ffffbf': 'gold',
      '#dfdfdf': 'silver',
      '#ffdf9f': 'bronze',
      '#efcfff': 'retired',
      '#000000': 'excluded',
    }) as Record<string, ResultTone>
  )[cell.bg ?? ''] ?? null;

function profileCell(cell: WikiCell | undefined): ProfileCell {
  return {
    text: cell?.text ?? '',
    links: (cell?.links ?? []).map((link) => ({
      name: link.text,
      article: link.title,
      flag: cell?.lines.find((line) => line.link?.title === link.title)?.flag ?? null,
    })),
    tone: cell ? toneOf(cell) : null,
  };
}

/** Only the relevant results section; headings for other series never qualify. */
export function parseProfile(article: string, html: string, kind: ProfileKind): WecProfile {
  const doc = parseHtml(html);
  const sections = new Map<Element, { title: string; kind: ProfileTable['kind'] }>();
  let active: { level: number; title: string; kind: ProfileTable['kind'] } | null = null;
  for (const el of doc.querySelectorAll('h2,h3,h4,h5,table.wikitable')) {
    if (/^H/.test(el.tagName)) {
      const level = Number(el.tagName.slice(1));
      if (active && level <= active.level) active = null;
      const title = cleanText(el);
      const tableKind = /World Endurance Championship.*(results|record)/i.test(title)
        ? 'wec'
        : /24 Hours of Le Mans.*results/i.test(title)
          ? 'lemans'
          : kind === 'circuit' && /^Winners$/i.test(title)
            ? 'winners'
            : null;
      if (tableKind) active = { level, title, kind: tableKind };
    } else if (active) sections.set(el, active);
  }
  const tables: ProfileTable[] = [];
  const parsedTables = wikiTables(doc);
  for (const table of parsedTables) {
    const section = sections.get(table.el);
    if (!section || (kind === 'circuit' && section.kind !== 'winners')) continue;
    const year = columnIndex(table, /^(Year|Season)(?:\s*\/|$)/i);
    if (year < 0) continue;
    const cls = columnIndex(table, /^Class$/i);
    const rows: ProfileRow[] = [];
    for (const row of table.rows) {
      const yearText = row[year]?.text ?? '';
      const season = /^(\d{4})(?:[–-](\d{2,4}))?/.exec(yearText);
      if (!season || row[year]?.el === row.find((_, i) => i !== year)?.el) continue;
      rows.push({
        season: season[1] + (season[2] ? `-${season[2].slice(-2)}` : ''),
        cells: table.columns.map((_, i) => {
          const c = profileCell(row[i]);
          if (i === cls) c.text = normalizeClass(c.text);
          return c;
        }),
      });
    }
    const columns = table.columns.map((_, i) =>
      [
        ...new Set(
          table.head
            .filter((row) => !row.every((cell) => cell?.el === row[0]?.el))
            .map((row) => row[i]?.text)
            .filter(Boolean),
        ),
      ].join(' / '),
    );
    if (rows.length) tables.push({ title: section.title, kind: section.kind, columns, rows });
  }
  return {
    article,
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
