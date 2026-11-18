import { ApiError, type ApiClient, type GetOptions } from '../../../api/client';
import type { Fetched } from '../../../api/types';
import { articleMeta, findSection, query, sectionsOf, textOf, wikiClient } from '../../../api/wikipedia';
import { validArticle } from '../../../lib/wikiArticle';
import type { Crew } from '../../../lib/wikiEntries';
import type { SeriesProfile, SeriesProfileKind } from '../../../lib/wikiProfile';
import { seasonArticle } from '../data/seasons';
import { parseImsaEntries } from '../domain/participants';
import { parseImsaProfile } from '../domain/profiles';
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
    /** Entry list of the season: crews with class, number, team, car and drivers. */
    async getParticipants(id: string, opts: GetOptions = {}): Promise<Fetched<Crew[]>> {
      const title = seasonArticle(id);
      const options = { ...opts, immutable: settled(id) };
      const toc = await api.get(query({ page: title, prop: 'sections' }), options);
      const section = findSection(sectionsOf(toc.data), /^(Entries|Entry list|Teams and drivers)$/i, true);
      if (!section) return { data: [], meta: articleMeta(toc.meta, title) };
      const res = await api.get(query({ page: title, prop: 'text', section: section.index }), options);
      return { data: parseImsaEntries(textOf(res.data)), meta: articleMeta(res.meta, title) };
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
        data: parseImsaProfile(canonical, textOf(res.data), kind),
        meta: articleMeta(res.meta, canonical),
      };
    },
  };
}

export const imsaWikipedia = createImsaWikipedia();
