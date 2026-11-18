import { ApiError, type ApiClient, type GetOptions } from '../../../api/client';
import type { Fetched } from '../../../api/types';
import { articleMeta, findSection, query, sectionsOf, textOf, wikiClient } from '../../../api/wikipedia';
import { validArticle } from '../../../lib/wikiArticle';
import type { Crew } from '../../../lib/wikiEntries';
import type { SeriesProfile, SeriesProfileKind } from '../../../lib/wikiProfile';
import { seasonArticle } from '../data/seasons';
import { parseDtmEntries } from '../domain/participants';
import { parseDtmProfile } from '../domain/profiles';
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
    /** Entry list of the season: crews with class, number, team, car and drivers. */
    async getParticipants(id: string, opts: GetOptions = {}): Promise<Fetched<Crew[]>> {
      const title = seasonArticle(id);
      const options = { ...opts, immutable: Number(id) + 1 < new Date().getFullYear() };
      const toc = await api.get(query({ page: title, prop: 'sections' }), options);
      const section = findSection(
        sectionsOf(toc.data),
        /^(Teams and drivers|Entries|Entry list|Teams)$/i,
        true,
      );
      if (!section) return { data: [], meta: articleMeta(toc.meta, title) };
      const res = await api.get(query({ page: title, prop: 'text', section: section.index }), options);
      return { data: parseDtmEntries(textOf(res.data)), meta: articleMeta(res.meta, title) };
    },
    /** Driver, team or circuit article; careers keep changing, so it is never treated as settled. */
    async getProfile(
      title: string,
      kind: SeriesProfileKind,
      opts: GetOptions = {},
    ): Promise<Fetched<SeriesProfile>> {
      if (!validArticle(title)) throw new Error('Недопустимое название статьи');
      const res = await api.get(query({ page: title, prop: 'text' }), { ...opts, immutable: false });
      const canonical = (res.data as { parse: { title?: string } }).parse.title ?? title;
      return {
        data: parseDtmProfile(canonical, textOf(res.data), kind),
        meta: articleMeta(res.meta, canonical),
      };
    },
  };
}

export const dtmWikipedia = createDtmWikipedia();
