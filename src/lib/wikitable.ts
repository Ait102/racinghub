// Reading Wikipedia tables (HTML from the MediaWiki parse API) into plain data.
// Tables use rowspan/colspan, flags, links and background colors; this module turns
// them into a grid where a spanned cell simply repeats, so callers can read by column.

export interface WikiLink {
  /** Article title, e.g. "Sébastien Buemi". */
  title: string;
  text: string;
}

export interface WikiFlag {
  /** Country as Wikipedia names it (alt/title of the flag), e.g. "United Kingdom". */
  country: string;
  /** Absolute image URL on upload/thumb.wikimedia.org (flags are public domain). */
  src: string;
}

/** One line of a cell (cells often hold several names separated by <br>). */
export interface WikiLine {
  text: string;
  link: WikiLink | null;
  flag: WikiFlag | null;
}

export interface WikiCell {
  /** The source element: the same object appears in every grid slot it spans. */
  el: Element;
  header: boolean;
  text: string;
  lines: WikiLine[];
  links: WikiLink[];
  flags: WikiFlag[];
  bold: boolean;
  /** Background color as lowercase #rrggbb, if the cell sets one. */
  bg: string | null;
}

export interface WikiTable {
  /** Column names; multi-row headers are joined with " / ". */
  columns: string[];
  /** Header rows as a grid (for links in column headers). */
  head: WikiCell[][];
  rows: WikiCell[][];
  /** Text of the nearest heading above the table. */
  heading: string | null;
  el: HTMLTableElement;
}

export function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

const NOISE =
  'style, script, sup.reference, .reference, .mw-ref, .sortkey, .noprint, [style*="display:none"]';

/** Text without footnote marks, hidden sort keys and embedded CSS; whitespace collapsed. */
export function cleanText(node: Node): string {
  const copy = node.cloneNode(true) as Element;
  if (copy.querySelectorAll) copy.querySelectorAll(NOISE).forEach((n) => n.remove());
  return (copy.textContent ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\[\s*(?:[a-z]|\d+|N \d+|nb \d+|note \d+)\s*\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function linkOf(a: Element): WikiLink | null {
  const href = a.getAttribute('href') ?? '';
  const m = /^(?:https?:)?(?:\/\/en\.wikipedia\.org)?\/wiki\/([^#?]+)/.exec(href);
  if (!m || /^(File|Help|Wikipedia|Template|Category|Special):/i.test(decodeURIComponent(m[1]))) return null;
  const title = (a.getAttribute('title') ?? decodeURIComponent(m[1]).replace(/_/g, ' ')).replace(
    / \(page does not exist\)$/,
    '',
  );
  return { title, text: cleanText(a) };
}

function absolute(src: string): string {
  return src.startsWith('//') ? `https:${src}` : src;
}

function flagOf(el: Element): WikiFlag | null {
  const img = el.querySelector('img');
  if (!img) return null;
  const src = img.getAttribute('src') ?? '';
  if (!/^(?:https?:)?\/\/(?:upload|thumb)\.wikimedia\.org\//.test(src)) return null;
  const country =
    img.getAttribute('alt') ||
    el.querySelector('a')?.getAttribute('title') ||
    decodeURIComponent(/Flag_of_(?:the_)?([^./]+)/.exec(src)?.[1] ?? '').replace(/_/g, ' ');
  return country ? { country, src: absolute(src) } : null;
}

function isFlag(el: Element): boolean {
  return el.classList.contains('flagicon') || !!el.closest('.flagicon');
}

/** Splits a cell into lines at <br>, keeping each line's link and flag. */
function linesOf(cell: Element): WikiLine[] {
  const groups: Node[][] = [[]];
  // Line breaks can sit inside inline wrappers, e.g. a whole crew in bold: <b>A<br>B</b>.
  const walk = (parent: Node) => {
    for (const n of [...parent.childNodes]) {
      if (n.nodeName === 'BR') groups.push([]);
      else if (
        n instanceof Element &&
        /^(B|I|SPAN|SMALL|DIV|P|STRONG)$/.test(n.tagName) &&
        n.querySelector('br')
      )
        walk(n);
      else groups[groups.length - 1].push(n);
    }
  };
  walk(cell);
  const lines: WikiLine[] = [];
  for (const nodes of groups) {
    const box = cell.ownerDocument.createElement('span');
    nodes.forEach((n) => box.appendChild(n.cloneNode(true)));
    const text = cleanText(box);
    const flagEl = box.querySelector('.flagicon');
    const flag = flagEl ? flagOf(flagEl) : null;
    const a = [...box.querySelectorAll('a')].find((x) => !isFlag(x) && linkOf(x));
    if (!text && !flag) continue;
    lines.push({ text, link: a ? linkOf(a) : null, flag });
  }
  return lines;
}

function bgOf(el: Element): string | null {
  const style = el.getAttribute('style') ?? '';
  const m = /background(?:-color)?\s*:\s*(#[0-9a-f]{3,6}|[a-z]+)/i.exec(style);
  if (!m) return null;
  let v = m[1].toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(v)) v = '#' + [...v.slice(1)].map((c) => c + c).join('');
  const named: Record<string, string> = { black: '#000000', white: '#ffffff' };
  return named[v] ?? (v.startsWith('#') ? v : null);
}

function readCell(el: Element): WikiCell {
  return {
    el,
    header: el.tagName === 'TH',
    text: cleanText(el),
    lines: linesOf(el),
    links: [...el.querySelectorAll('a')]
      .filter((a) => !isFlag(a))
      .map(linkOf)
      .filter((x): x is WikiLink => x !== null),
    flags: [...el.querySelectorAll('.flagicon')].map(flagOf).filter((x): x is WikiFlag => x !== null),
    bold: !!el.querySelector('b') && cleanText(el.querySelector('b')!) === cleanText(el),
    bg: bgOf(el),
  };
}

/** The table as a grid: rowspan/colspan cells are repeated in every slot they cover. */
export function tableGrid(table: HTMLTableElement): WikiCell[][] {
  const grid: WikiCell[][] = [];
  [...table.rows].forEach((row, r) => {
    grid[r] ??= [];
    let c = 0;
    for (const el of [...row.cells]) {
      while (grid[r][c]) c++;
      const cell = readCell(el);
      const rs = Math.max(1, Math.min(el.rowSpan || 1, table.rows.length - r));
      const cs = Math.max(1, el.colSpan || 1);
      for (let dr = 0; dr < rs; dr++) {
        grid[r + dr] ??= [];
        for (let dc = 0; dc < cs; dc++) grid[r + dr][c + dc] = cell;
      }
      c += cs;
    }
  });
  return grid.map((row) => Array.from(row, (cell) => cell));
}

/** Text of the closest heading before the element (h2…h5, also inside .mw-heading wrappers). */
export function headingOf(el: Element): string | null {
  let node: Element | null = el;
  while (node) {
    let prev = node.previousElementSibling;
    while (prev) {
      const h = /^H[2-5]$/.test(prev.tagName) ? prev : prev.querySelector?.('h2, h3, h4, h5');
      if (h && (prev.matches('div.mw-heading') || /^H[2-5]$/.test(prev.tagName))) return cleanText(h);
      prev = prev.previousElementSibling;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * Every `wikitable` in the document with its header rows turned into column names.
 * Header rows are the leading rows made only of <th>; a table without them is skipped.
 */
export function wikiTables(doc: Document | Element): WikiTable[] {
  const out: WikiTable[] = [];
  for (const el of [...doc.querySelectorAll('table.wikitable')] as HTMLTableElement[]) {
    const grid = tableGrid(el);
    let h = 0;
    while (h < grid.length && grid[h].length > 0 && grid[h].every((c) => c?.header)) h++;
    if (h === 0) continue;
    const width = Math.max(...grid.map((r) => r.length));
    const columns = Array.from({ length: width }, (_, i) => {
      const parts: string[] = [];
      for (let r = 0; r < h; r++) {
        const t = grid[r][i]?.text ?? '';
        if (t && parts[parts.length - 1] !== t) parts.push(t);
      }
      return parts.join(' / ');
    });
    out.push({ columns, head: grid.slice(0, h), rows: grid.slice(h), heading: headingOf(el), el });
  }
  return out;
}

/** Index of the first column whose name matches. */
export function columnIndex(table: WikiTable, re: RegExp): number {
  return table.columns.findIndex((c) => re.test(c));
}

/**
 * Groups consecutive rows that share the same cell in `col` (e.g. a result spread over
 * two rows by rowspan). Rows where that column is missing start their own group.
 */
export function groupRows(rows: WikiCell[][], col = 0): WikiCell[][][] {
  const groups: WikiCell[][][] = [];
  let lastEl: Element | null = null;
  for (const row of rows) {
    const el = row[col]?.el ?? null;
    if (el && el === lastEl) groups[groups.length - 1].push(row);
    else groups.push([row]);
    lastEl = el;
  }
  return groups;
}
