import {
  cleanText,
  groupRows,
  wikiTables,
  type WikiCell,
  type WikiFlag,
  type WikiLine,
  type WikiTable,
} from './wikitable';

/** A person, team, manufacturer or place, with its Wikipedia article if linked. */
export interface Named {
  name: string;
  /** Wikipedia article title; null when the source does not link one. */
  article: string | null;
  flag: WikiFlag | null;
}

/** Color of a result cell in a standings table, as Wikipedia colors it. */
export type ResultTone =
  'gold' | 'silver' | 'bronze' | 'points' | 'nopoints' | 'retired' | 'excluded' | 'dns' | 'withdrawn' | null;

export interface ResultCell {
  text: string;
  tone: ResultTone;
  /** FE finishing position with superscript annotations removed; null for statuses. */
  place?: number | null;
}

export interface StandingRound {
  /** Short name used by the source, e.g. "LMS". */
  abbr: string;
  /** Race article the column links to. */
  report: string | null;
}

export interface StandingRow {
  pos: number | null;
  posText: string;
  name: Named;
  /** Extra column such as the team (drivers) or the car number (teams). */
  extra: string | null;
  /** One line per car counted (manufacturers can score with two cars). */
  lines: ResultCell[][];
  /** Published extra column for each car when the source shares a team cell. */
  lineLabels?: string[];
  points: string;
  pointsValue: number | null;
}

export type StandingKind = 'drivers' | 'manufacturers' | 'teams';

export interface StandingTable {
  /** Stable id for URLs, from the title. */
  id: string;
  title: string;
  kind: StandingKind;
  /** First column header for the name, e.g. "Driver". */
  nameHeader: string;
  extraHeader: string | null;
  rounds: StandingRound[];
  rows: StandingRow[];
}

function named(line: WikiLine | undefined): Named | null {
  if (!line) return null;
  const name = (line.link?.text || line.text).trim();
  if (!name) return null;
  return { name, article: line.link?.title ?? null, flag: line.flag };
}

function namedCell(cell: WikiCell | undefined): Named | null {
  if (!cell) return null;
  const first = cell.lines.find((l) => l.text);
  if (!first) return null;
  // A cell with one flag and one link but split into pieces still names one thing.
  return named({ ...first, text: cell.text, link: first.link ?? cell.links[0] ?? null });
}

function intOf(text: string | undefined): number | null {
  const m = /^\s*(\d+)/.exec(text ?? '');
  return m ? Number(m[1]) : null;
}

const cellAt = (row: WikiCell[] | undefined, i: number): WikiCell | undefined =>
  i >= 0 ? row?.[i] : undefined;
const textAt = (row: WikiCell[] | undefined, i: number): string => cellAt(row, i)?.text ?? '';
const orNull = (s: string) => (s && s !== '—' && s !== '-' ? s : null);

const TONES: Record<string, ResultTone> = {
  '#ffffbf': 'gold',
  '#dfdfdf': 'silver',
  '#ffdf9f': 'bronze',
  '#dfffdf': 'points',
  '#cfcfff': 'nopoints',
  '#efcfff': 'retired',
  '#000000': 'excluded',
  '#ffffff': 'dns',
  '#ffcfcf': 'withdrawn',
};

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'table'
  );
}

function kindOf(nameHeader: string, title: string): StandingKind {
  if (/driver/i.test(nameHeader)) return 'drivers';
  if (/manufacturer/i.test(nameHeader)) return 'manufacturers';
  if (/driver/i.test(title)) return 'drivers';
  if (/manufacturer/i.test(title)) return 'manufacturers';
  return 'teams';
}

function isStandings(t: WikiTable, series: 'wec' | 'fe'): boolean {
  return (
    /^Pos/i.test(t.columns[0] ?? '') &&
    (series === 'fe'
      ? t.columns.some((column) => /^(Points|Pts)\.?$/i.test(column))
      : /points/i.test(t.columns[t.columns.length - 1] ?? ''))
  );
}

export function parseStandings(
  doc: Document,
  tables = wikiTables(doc),
  { series = 'wec' }: { series?: 'wec' | 'fe' } = {},
): StandingTable[] {
  const out: StandingTable[] = [];
  const used = new Set<string>();
  for (const table of tables.filter((table) => isStandings(table, series))) {
    // Some FE source footers have an oversized colspan; the points header still locates the final data column.
    const last =
      series === 'fe'
        ? table.columns.findIndex((column) => /^(Points|Pts)\.?$/i.test(column))
        : table.columns.length - 1;
    const roundCols = table.columns
      .map((_, i) => i)
      .filter((i) => i > 1 && i < last && table.head.some((r) => (r[i]?.links.length ?? 0) > 0));
    if (roundCols.length === 0) continue;
    const extraCols = table.columns.map((_, i) => i).filter((i) => i > 1 && i < roundCols[0]);
    const extra = extraCols[extraCols.length - 1] ?? -1;
    const title = table.heading ?? 'Зачёт';
    const carFirst = /^(Car|No)/i.test(table.columns[1] ?? '');
    let id = slug(title);
    for (let n = 2; used.has(id); n++) id = `${slug(title)}-${n}`;
    used.add(id);

    const rows: StandingRow[] = [];
    for (const posGroup of groupRows(table.rows, 0)) {
      const posText = textAt(posGroup[0], 0);
      if (!posText || /source|note/i.test(posText)) continue;
      if (series === 'fe' && /^Pos(?:ition)?\.?$/i.test(posText)) continue;
      // Co-drivers can share one position cell; each name is its own entry.
      for (const group of groupRows(posGroup, 1)) {
        // Team trophies list the car number first and the team next to it.
        const byCar = carFirst && extra >= 0;
        const name = namedCell(cellAt(group[0], byCar ? extra : 1));
        if (!name) continue;
        if (series === 'fe') name.name = textAt(group[0], byCar ? extra : 1);
        const points = textAt(group[0], last);
        const extraText = extra >= 0 ? orNull(textAt(group[0], byCar ? 1 : extra)) : null;
        rows.push({
          pos: intOf(posText),
          posText,
          name,
          extra: byCar && extraText ? `№ ${extraText}` : extraText,
          lines: group.map((row) =>
            roundCols.map((i) => {
              const c = cellAt(row, i);
              const result: ResultCell = { text: c?.text ?? '', tone: c?.bg ? (TONES[c.bg] ?? null) : null };
              if (series === 'fe') {
                const cell = c?.el.cloneNode(true) as Element | undefined;
                cell?.querySelectorAll('sup').forEach((sup) => sup.remove());
                const value = cell
                  ? cleanText(cell)
                      .replace(/[†‡*]+$/g, '')
                      .trim()
                  : '';
                result.place = /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : null;
              }
              return result;
            }),
          ),
          ...(series === 'fe' && extra >= 0 ? { lineLabels: group.map((row) => textAt(row, extra)) } : {}),
          points,
          pointsValue: /^-?\d+(?:\.\d+)?/.test(points) ? parseFloat(points) : null,
        });
      }
    }
    if (rows.length === 0) continue;
    const nameHeader = (carFirst && extra >= 0 ? table.columns[extra] : table.columns[1]) ?? '';
    out.push({
      id,
      title,
      kind: kindOf(nameHeader, title),
      nameHeader,
      extraHeader: extra >= 0 ? (carFirst ? 'Машина' : table.columns[extra]) : null,
      rounds: roundCols.map((i) => {
        const head = table.head.map((r) => r[i]).find((c) => c && c.links.length > 0);
        return { abbr: head?.text || table.columns[i], report: head?.links[0]?.title ?? null };
      }),
      rows,
    });
  }
  return out;
}
