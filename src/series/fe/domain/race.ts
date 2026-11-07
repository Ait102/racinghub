import {
  cleanText,
  columnIndex,
  parseHtml,
  tableGrid,
  wikiTables,
  type WikiCell,
  type WikiTable,
} from '../../../lib/wikitable';
import type { FeNamed } from './types';

export interface FeRaceEntry {
  pos: number | null;
  posText: string;
  number: string | null;
  driver: FeNamed | null;
  team: FeNamed | null;
  laps: string | null;
  time: string | null;
  grid: string | null;
  points: string | null;
}

export interface FeQualifyingTable {
  title: string;
  kind: 'groups' | 'duels' | 'classification';
  columns: string[];
  rows: string[][];
}

export interface FeRaceSession {
  raceNumber: number | null;
  title: string;
  classification: FeRaceEntry[];
  qualifying: FeQualifyingTable[];
  /** Explicit infobox podium, separate from an unpublished full race protocol. */
  podium?: Array<{ pos: number; driver: FeNamed; team: FeNamed | null }>;
}

export interface FeRaceCircuit {
  location: string | null;
  course: string | null;
  length: string | null;
}

export interface FeRaceData {
  article: string;
  title: string;
  description: string | null;
  circuit: FeRaceCircuit | null;
  races: FeRaceSession[];
}

function named(cell: WikiCell | undefined): FeNamed | null {
  if (!cell?.text) return null;
  const link = cell.links[0];
  return { name: cell.text, article: link?.title ?? null, flag: cell.flags[0] ?? null };
}

function sourceText(cell: WikiCell | undefined): string | null {
  if (!cell?.text) return null;
  const copy = cell.el.cloneNode(true) as Element;
  for (const sup of copy.querySelectorAll('sup:not(.reference)')) {
    const text = cleanText(sup);
    const digits = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    sup.replaceWith(/^\d+$/.test(text) ? [...text].map((c) => digits[Number(c)]).join('') : `^${text}`);
  }
  return cleanText(copy) || null;
}

function classification(table: WikiTable): FeRaceEntry[] {
  const columns = {
    pos: columnIndex(table, /^Pos\.?$/i),
    number: columnIndex(table, /^No\.?$/i),
    driver: columnIndex(table, /^Driver$/i),
    team: columnIndex(table, /^Team$/i),
    laps: columnIndex(table, /^Laps$/i),
    time: columnIndex(table, /^Time\s*\/\s*Retired$/i),
    grid: columnIndex(table, /^Grid$/i),
    points: columnIndex(table, /^Points$/i),
  };
  if (columns.driver < 0 || columns.laps < 0 || columns.time < 0) return [];
  return table.rows.flatMap((row) => {
    const driver = named(row[columns.driver]);
    if (!driver || row[columns.driver]?.header) return [];
    const posText = row[columns.pos]?.text ?? '';
    return [
      {
        pos: /^\d+$/.test(posText) ? Number(posText) : null,
        posText,
        number: row[columns.number]?.text || null,
        driver,
        team: named(row[columns.team]),
        laps: sourceText(row[columns.laps]),
        time: sourceText(row[columns.time]),
        grid: sourceText(row[columns.grid]),
        points: sourceText(row[columns.points]),
      },
    ];
  });
}

/** A bracket's stage columns contain repeated rowspan cells; retain each entrant once per stage. */
function duels(el: HTMLTableElement): FeQualifyingTable | null {
  const grid = tableGrid(el);
  const head = grid[0] ?? [];
  const headings = [
    ...new Set(head.filter((c) => /^(Quarter-finals|Semi-finals|Final)$/i.test(c?.text ?? ''))),
  ];
  if (!headings.length) return null;
  const stages = headings.map((heading) => {
    const indices = head.flatMap((cell, index) => (cell === heading ? [index] : []));
    const seen = new Set<Element>();
    return grid.slice(1).flatMap((row) => {
      const text = indices
        .flatMap((i) => {
          const cell = row[i];
          if (!cell?.text || seen.has(cell.el)) return [];
          seen.add(cell.el);
          return [cell.text];
        })
        .join(' ');
      return text ? [text] : [];
    });
  });
  return {
    title: 'Qualifying duels',
    kind: 'duels',
    columns: headings.map((h) => h.text),
    rows: Array.from({ length: Math.max(...stages.map((s) => s.length)) }, (_, i) =>
      stages.map((s) => s[i] ?? ''),
    ),
  };
}

function qualifying(table: WikiTable): FeQualifyingTable {
  const groups = table.columns.every((c) => /^Group draw$/i.test(c));
  if (groups) {
    return {
      title: 'Group draw',
      kind: 'groups',
      columns: ['Group', 'Drivers'],
      rows: table.rows.map((row) => [
        row[0]?.text ?? '',
        row
          .slice(1)
          .map((c) => c.text)
          .filter(Boolean)
          .join(' · '),
      ]),
    };
  }
  return {
    title: table.heading ?? 'Qualifying',
    kind: 'classification',
    columns: table.columns,
    rows: table.rows
      .filter((row) => {
        const driver = row[columnIndex(table, /^Driver$/i)];
        return driver?.text && !driver.header && driver.el !== row[0]?.el;
      })
      .map((row) => table.columns.map((_, i) => row[i]?.text ?? '')),
  };
}

export function parseRace(article: string, html: string): FeRaceData {
  const doc = parseHtml(html);
  const tables = new Map(wikiTables(doc).map((t) => [t.el, t]));
  const races: FeRaceSession[] = [];
  let current: FeRaceSession | null = null;
  let section = '';
  let qualifyingSection = false;
  const headings = new Map<number, string>();
  const ensureRace = () => {
    if (!current) {
      current = { raceNumber: null, title: 'Race', classification: [], qualifying: [] };
      races.push(current);
    }
    return current;
  };
  for (const node of doc.querySelectorAll('h2,h3,h4,h5,h6,table')) {
    if (node.closest('table') && node.tagName !== 'TABLE') continue;
    if (/^H[2-6]$/.test(node.tagName)) {
      const level = Number(node.tagName.slice(1));
      for (const key of headings.keys()) if (key >= level) headings.delete(key);
      section = cleanText(node);
      headings.set(level, section);
      const race = /^Race\s+([1-9]\d*|one|two)$/i.exec(section);
      if (race) {
        const raceNumber = Number(race[1]) || ['one', 'two'].indexOf(race[1].toLowerCase()) + 1;
        current = { raceNumber, title: section, classification: [], qualifying: [] };
        races.push(current);
      }
      qualifyingSection =
        [...headings.values()].some((h) => /^Qualif/i.test(h)) || /^Overall classification$/i.test(section);
      continue;
    }
    const el = node as HTMLTableElement;
    if (el.parentElement?.closest('table')) continue;
    const table = tables.get(el);
    if (table && columnIndex(table, /^Laps$/i) >= 0 && columnIndex(table, /^Driver$/i) >= 0) {
      const rows = classification(table);
      if (rows.length) ensureRace().classification = rows;
    } else if (qualifyingSection) {
      const bracket = duels(el);
      if (bracket) ensureRace().qualifying.push(bracket);
      else if (
        table &&
        (columnIndex(table, /^Driver$/i) >= 0 || table.columns.every((c) => /^Group draw$/i.test(c)))
      ) {
        ensureRace().qualifying.push(qualifying(table));
      }
    }
  }
  const infoboxes = [...doc.querySelectorAll<HTMLTableElement>('table.infobox')];
  const numberedSections = [...races];
  infoboxes.forEach((box, index) => {
    const podium = tableGrid(box).flatMap((row) => {
      const rank = ['First', 'Second', 'Third'].indexOf(row[0]?.text ?? '');
      const driver = rank >= 0 ? named(row[1]) : null;
      return driver
        ? [{ pos: rank + 1, driver, team: row[2]?.el !== row[1]?.el ? named(row[2]) : null }]
        : [];
    });
    if (!podium.length) return;
    const raceNumber = infoboxes.length > 1 ? index + 1 : null;
    let race =
      races.find((session) => session.raceNumber === raceNumber) ??
      (numberedSections.length === infoboxes.length ? numberedSections[index] : undefined);
    if (!race) {
      race = {
        raceNumber,
        title: raceNumber === null ? 'Race' : `Race ${raceNumber}`,
        classification: [],
        qualifying: [],
      };
      races.push(race);
    }
    race.podium = podium;
  });
  const infobox = infoboxes[0];
  const info = new Map(
    [...(infobox?.querySelectorAll('tr') ?? [])].flatMap((row) => {
      const label = row.querySelector('th.infobox-label');
      const value = row.querySelector('td.infobox-data');
      return label && value ? [[cleanText(label), cleanText(value)]] : [];
    }),
  );
  const root = doc.querySelector('.mw-parser-output') ?? doc.body;
  let description: string | null = null;
  for (const node of root.children) {
    if (/^H[2-6]$/.test(node.tagName) || node.classList.contains('mw-heading')) break;
    if (node.tagName === 'P' && cleanText(node).length >= 50) {
      description = cleanText(node);
      break;
    }
  }
  return {
    article,
    title: cleanText(doc.querySelector('.infobox-above') ?? doc.createTextNode(article)),
    description,
    circuit: info.size
      ? {
          location: info.get('Location') || null,
          course: info.get('Course') || null,
          length: info.get('Course length') || null,
        }
      : null,
    races: races.filter((r) => r.classification.length || r.qualifying.length || r.podium?.length),
  };
}
