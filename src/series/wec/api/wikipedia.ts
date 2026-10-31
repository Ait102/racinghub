// WEC data from English Wikipedia (MediaWiki parse API, CC BY-SA 4.0).
// The season article is read in two sections only (calendar, results and standings)
// to keep downloads small; a race article is read whole.
import { createClient, type ApiClient, type GetOptions } from '../../../api/client';
import type { DataMeta, Fetched } from '../../../api/types';
import { isPastSeason, seasonArticle } from '../data/seasons';
import { parseRace, parseSeason } from '../domain/parse';
import type { WecRaceData, WecSeasonData } from '../domain/types';

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

const wikiClient = createClient({ baseUrl: WIKI_API, provider: WIKI_PROVIDER, minIntervalMs: 100, validate });

interface Section {
  index: string;
  line: string;
  toclevel: number;
}

function query(params: Record<string, string>): string {
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

const textOf = (data: unknown) => String((data as { parse: { text?: string } }).parse.text ?? '');

/** Source line under the data points to the article, not to the API. */
function articleMeta(meta: DataMeta, title: string): DataMeta {
  return { ...meta, sourceUrl: articleUrl(title) };
}

// Parsing a season takes a moment: keep the result per downloaded copy.
const parsedSeasons = new Map<string, WecSeasonData>();
const parsedRaces = new Map<string, WecRaceData>();

export function createWikipedia(api: ApiClient = wikiClient) {
  return {
    async getSeason(id: string, opts: GetOptions = {}): Promise<Fetched<WecSeasonData>> {
      const title = seasonArticle(id);
      const o: GetOptions = { ...opts, immutable: isPastSeason(id) };
      const toc = await api.get(query({ page: title, prop: 'sections' }), o);
      const sections = (toc.data as { parse: { sections?: Section[] } }).parse.sections ?? [];
      const top = sections.filter((s) => s.toclevel === 1);
      const cal = top.find((s) => /^(Calendar|Schedule)/i.test(s.line));
      const res = top.find((s) => /^Results/i.test(s.line));
      const [calendar, results] = await Promise.all([
        cal ? api.get(query({ page: title, prop: 'text', section: cal.index }), o) : null,
        res ? api.get(query({ page: title, prop: 'text', section: res.index }), o) : null,
      ]);
      const key = `${id}|${calendar?.meta.fetchedAt}|${results?.meta.fetchedAt}`;
      let data = parsedSeasons.get(key);
      if (!data) {
        data = parseSeason(
          id,
          title,
          calendar ? textOf(calendar.data) : '',
          results ? textOf(results.data) : '',
        );
        parsedSeasons.set(key, data);
      }
      const stale = [toc, calendar, results].find((x) => x?.meta.stale)?.meta;
      return { data, meta: articleMeta(stale ?? (results ?? calendar ?? toc).meta, title) };
    },

    async getRace(title: string, seasonId: string, opts: GetOptions = {}): Promise<Fetched<WecRaceData>> {
      const res = await api.get(query({ page: title, prop: 'text' }), {
        ...opts,
        immutable: isPastSeason(seasonId),
      });
      const key = `${title}|${res.meta.fetchedAt}`;
      let data = parsedRaces.get(key);
      if (!data) {
        data = parseRace(title, textOf(res.data));
        parsedRaces.set(key, data);
      }
      return { data, meta: articleMeta(res.meta, title) };
    },
  };
}

export const wikipedia = createWikipedia();
