import { infoboxPhotoFiles } from '../../../api/wikimedia';
import { cleanText, columnIndex, parseHtml, wikiTables, type WikiCell } from '../../../lib/wikitable';
import { isPastSeason } from '../data/seasons';
import { normalizeClass, parseStandings } from './parse';
import type { Participant } from './participants';
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
  photoFiles: string[];
  facts: Array<{ label: string; value: string }>;
  biography: string | null;
  tables: ProfileTable[];
  standings: StandingTable[];
}

const BIRTH_NAME = '.nickname, .birth-name';

function infoboxText(el: Element): string {
  const copy = el.cloneNode(true) as Element;
  copy.querySelectorAll('br').forEach((br) => br.replaceWith(' '));
  copy.querySelectorAll(`.bday, [hidden], ${BIRTH_NAME}`).forEach((hidden) => hidden.remove());
  copy.querySelectorAll('[style]').forEach((el) => {
    if (/display\s*:\s*none\b/i.test(el.getAttribute('style') ?? '')) el.remove();
  });
  // "31 October 1988, Aigle, Vaud, Switzerland" rather than the date and place run together.
  const place = copy.querySelector('.birthplace');
  const placeText = place ? cleanText(place) : '';
  place?.remove();
  return [cleanText(copy), placeText].filter(Boolean).join(', ');
}

function driverFacts(doc: Document): WecProfile['facts'] {
  const facts: WecProfile['facts'] = [];
  let section = '';
  for (const row of doc.querySelectorAll('.infobox tr')) {
    const heading = row.querySelector(':scope > th');
    const value = row.querySelector(':scope > td');
    if (!heading) continue;
    const key = cleanText(heading);
    if (!value) {
      section = key;
      continue;
    }
    const labels: Record<string, string> = {
      Born: 'Родился',
      'Full name': 'Полное имя',
      'Birth name': 'Имя при рождении',
      Nationality: 'Национальность',
      'Racing licence': 'Гоночная лицензия',
    };
    if (/World Endurance Championship/i.test(section)) {
      Object.assign(labels, {
        'Debut season': 'Дебют в WEC',
        'Current team': 'Команда в WEC',
        Categorisation: 'Категория FIA',
        'Car number': 'Номер в WEC',
      });
    }
    const add = (label: string | undefined, text: string) => {
      if (label && text && !facts.some((fact) => fact.label === label)) facts.push({ label, value: text });
    };
    // The "Born" cell starts with the full name; it is a fact of its own, not part of the date.
    const birthName = key === 'Born' ? value.querySelector(BIRTH_NAME) : null;
    if (birthName) add('Полное имя', cleanText(birthName));
    add(labels[key], infoboxText(value));
  }
  return facts;
}

function leadBiography(doc: Document): string | null {
  const root = doc.querySelector('.mw-parser-output') ?? doc.body;
  for (const el of root.children) {
    if (/^H[2-6]$/.test(el.tagName) || el.classList.contains('mw-heading')) break;
    if (el.tagName !== 'P' || el.closest('.hatnote, .shortdescription')) continue;
    // Pronunciation guides ("French pronunciation: [sebastjɛ̃ …]") are not part of the biography.
    const copy = el.cloneNode(true) as Element;
    copy.querySelectorAll('[class*="IPA"], style').forEach((n) => n.remove());
    const text = cleanText(copy)
      .replace(/\(\s*[;,]\s*/g, '(')
      .replace(/\s*\(\s*\)/g, '');
    if (text.length >= 50) return text;
  }
  return null;
}

/** A team may appear under both the requested and canonical article titles. */
export function teamCars(participants: Participant[], articles: readonly string[]): Named[] {
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
    photoFiles: infoboxPhotoFiles(doc),
    facts: kind === 'driver' ? driverFacts(doc) : [],
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
