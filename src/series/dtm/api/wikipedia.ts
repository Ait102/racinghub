import { ApiError, type ApiClient, type GetOptions } from '../../../api/client';
import type { Fetched } from '../../../api/types';
import { articleMeta, query, sectionsOf, textOf, wikiClient } from '../../../api/wikipedia';
import { seasonArticle } from '../data/seasons';
import { parseDtmSeason, type DtmSeasonData } from '../domain/season';

// Top-level sections holding the calendar, winners and standings (names changed over the years).
const SECTIONS = /calendar|schedule|results|standings|summary|championship/i;

export function createDtmWikipedia(api: ApiClient = wikiClient) {
  const parsed = new Map<string, DtmSeasonData>();
  return {
    async getSeason(id: string, opts: GetOptions = {}): Promise<Fetched<DtmSeasonData>> {
      const title = seasonArticle(id);
      // Last year's article still gets corrections; older ones are settled.
      const options = { ...opts, immutable: Number(id) + 1 < new Date().getFullYear() };
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
        data = parseDtmSeason(id, title, parts.map((p) => textOf(p.data)).join('\n'));
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
  };
}

export const dtmWikipedia = createDtmWikipedia();
