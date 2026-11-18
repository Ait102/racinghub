import { ApiError, type ApiClient, type GetOptions } from '../../../api/client';
import type { Fetched } from '../../../api/types';
import { articleMeta, query, sectionsOf, textOf, wikiClient } from '../../../api/wikipedia';
import { validArticle } from '../../../lib/wikiArticle';
import { seasonArticle } from '../data/seasons';
import { parseImsaRace, type ImsaRaceData } from '../domain/race';
import { parseImsaSeason, type ImsaSeasonData } from '../domain/season';

// Top-level sections with the schedule, class winners and standings (entry lists are not needed here).
const SECTIONS = /schedule|calendar|results|standings|championship/i;

// Last year's articles still get corrections; older ones are settled.
const settled = (id: string) => Number(id) + 1 < new Date().getFullYear();

export function createImsaWikipedia(api: ApiClient = wikiClient) {
  const parsed = new Map<string, ImsaSeasonData>();
  return {
    async getSeason(id: string, opts: GetOptions = {}): Promise<Fetched<ImsaSeasonData>> {
      const title = seasonArticle(id);
      const options = { ...opts, immutable: settled(id) };
      let toc;
      try {
        toc = await api.get(query({ page: title, prop: 'sections' }), options);
      } catch (error) {
        if (!(error instanceof ApiError) || error.kind !== 'parse' || error.message !== 'Статья не найдена')
          throw error;
        return {
          data: { id, article: title, races: [], standings: [], unavailable: true },
          meta: articleMeta(
            { provider: 'Википедия', sourceUrl: '', fetchedAt: new Date().toISOString(), stale: false },
            title,
          ),
        };
      }
      const sections = sectionsOf(toc.data).filter((s) => s.toclevel === 1 && SECTIONS.test(s.line));
      const parts = await Promise.all(
        sections.map((s) => api.get(query({ page: title, prop: 'text', section: s.index }), options)),
      );
      const key = `${id}|${parts.map((p) => p.meta.fetchedAt).join('|')}`;
      let data = parsed.get(key);
      if (!data) {
        data = parseImsaSeason(id, title, parts.map((p) => textOf(p.data)).join('\n'));
        parsed.set(key, data);
      }
      return {
        data,
        meta: articleMeta(
          [toc, ...parts].find((r) => r.meta.stale)?.meta ?? (parts.at(-1) ?? toc).meta,
          title,
        ),
      };
    },
    async getRace(title: string, seasonId: string, opts: GetOptions = {}): Promise<Fetched<ImsaRaceData>> {
      if (!validArticle(title)) throw new Error('Недопустимое название статьи');
      const res = await api.get(query({ page: title, prop: 'text' }), {
        ...opts,
        immutable: settled(seasonId),
      });
      return { data: parseImsaRace(title, textOf(res.data)), meta: articleMeta(res.meta, title) };
    },
  };
}

export const imsaWikipedia = createImsaWikipedia();
