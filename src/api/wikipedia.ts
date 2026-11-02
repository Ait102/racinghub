import { createClient } from './client';
import type { DataMeta } from './types';

export const WIKI_API = 'https://en.wikipedia.org/w/api.php';
export const WIKI_PROVIDER = 'Википедия';

export function articleUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

function validate(json: unknown): string | null {
  const j = json as { parse?: unknown; error?: { code?: string } } | null;
  if (j?.parse && typeof j.parse === 'object') return null;
  return j?.error?.code === 'missingtitle' ? 'Статья не найдена' : 'Нет данных статьи';
}

export const wikiClient = createClient({
  baseUrl: WIKI_API,
  provider: WIKI_PROVIDER,
  minIntervalMs: 100,
  validate,
});

export interface Section {
  index: string;
  line: string;
  toclevel: number;
}

export function query(params: Record<string, string>): string {
  const all = {
    action: 'parse',
    format: 'json',
    formatversion: '2',
    origin: '*',
    redirects: '1',
    disableeditsection: '1',
    disabletoc: '1',
    disablelimitreport: '1',
    ...params,
  };
  return '?' + new URLSearchParams(all).toString();
}

export const textOf = (data: unknown) => String((data as { parse: { text?: string } }).parse.text ?? '');

/** Source line under the data points to the article, not to the API. */
export function articleMeta(meta: DataMeta, title: string): DataMeta {
  return { ...meta, sourceUrl: articleUrl(title) };
}

export function sectionsOf(data: unknown): Section[] {
  return (data as { parse: { sections?: Section[] } }).parse.sections ?? [];
}

export function findSection(sections: Section[], heading: RegExp, topLevel = false): Section | undefined {
  return sections.find((section) => (!topLevel || section.toclevel === 1) && heading.test(section.line));
}
