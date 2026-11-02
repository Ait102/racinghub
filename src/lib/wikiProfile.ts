// Shared reading of a Wikipedia person/team/event article: infobox facts, the lead paragraph
// and the results tables under chosen headings. Each series decides which headings and facts count.
import type { Named, ResultTone } from './wikiStandings';
import { cleanText, columnIndex, wikiTables, type WikiCell, type WikiTable } from './wikitable';

export interface ProfileCell {
  text: string;
  links: Named[];
  tone: ResultTone;
}
export interface ProfileRow {
  season: string;
  cells: ProfileCell[];
}
export interface ProfileTable<K extends string = string> {
  title: string;
  kind: K;
  columns: string[];
  rows: ProfileRow[];
}
export interface Fact {
  label: string;
  value: string;
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

/** Infobox rows translated by `labels`, which may depend on the infobox section (e.g. "Formula E career"). */
export function infoboxFacts(doc: Document, labels: (section: string) => Record<string, string>): Fact[] {
  const facts: Fact[] = [];
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
    const add = (label: string | undefined, text: string) => {
      if (label && text && !facts.some((fact) => fact.label === label)) facts.push({ label, value: text });
    };
    // The "Born" cell starts with the full name; it is a fact of its own, not part of the date.
    const birthName = key === 'Born' ? value.querySelector(BIRTH_NAME) : null;
    if (birthName) add('Полное имя', cleanText(birthName));
    add(labels(section)[key], infoboxText(value));
  }
  return facts;
}

/** First real paragraph of the lead, without pronunciation guides. */
export function leadBiography(doc: Document): string | null {
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
  // Lines split by <br> ("Driver<br>Team", co-drivers) stay apart instead of running together.
  const lines = cell?.lines.map((line) => line.text).filter(Boolean) ?? [];
  return {
    text: lines.length > 1 ? lines.join(' · ') : (cell?.text ?? ''),
    links: (cell?.links ?? []).map((link) => ({
      name: link.text,
      article: link.title,
      flag: cell?.lines.find((line) => line.link?.title === link.title)?.flag ?? null,
    })),
    tone: cell ? toneOf(cell) : null,
  };
}

/**
 * Tables with a Year/Season column under the headings `pick` accepts (it returns the table kind).
 * A heading stays active for its subsections; `mapText` may normalise a column (e.g. class names).
 */
export function sectionTables<K extends string>(
  doc: Document,
  pick: (heading: string) => K | null,
  mapText?: (column: string, text: string) => string,
  tables: WikiTable[] = wikiTables(doc),
): ProfileTable<K>[] {
  const sections = new Map<Element, { title: string; kind: K }>();
  let active: { level: number; title: string; kind: K } | null = null;
  for (const el of doc.querySelectorAll('h2,h3,h4,h5,table.wikitable')) {
    if (/^H/.test(el.tagName)) {
      const level = Number(el.tagName.slice(1));
      if (active && level <= active.level) active = null;
      const title = cleanText(el);
      const kind = pick(title);
      if (kind) active = { level, title, kind };
    } else if (active) sections.set(el, active);
  }
  const out: ProfileTable<K>[] = [];
  for (const table of tables) {
    const section = sections.get(table.el);
    if (!section) continue;
    const year = columnIndex(table, /^(Year|Season|Edition)(?:\s*\/|$)/i);
    if (year < 0) continue;
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
    const rows: ProfileRow[] = [];
    for (const row of table.rows) {
      const yearText = row[year]?.text ?? '';
      const season = /^(\d{4})(?:[–-](\d{2,4}))?/.exec(yearText);
      if (!season || row[year]?.el === row.find((_, i) => i !== year)?.el) continue;
      rows.push({
        season: season[1] + (season[2] ? `-${season[2].slice(-2)}` : ''),
        cells: table.columns.map((name, i) => {
          const c = profileCell(row[i]);
          if (mapText) c.text = mapText(name, c.text);
          return c;
        }),
      });
    }
    if (rows.length) out.push({ title: section.title, kind: section.kind, columns, rows });
  }
  return out;
}
