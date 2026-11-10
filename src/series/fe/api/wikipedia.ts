import { ApiError, type ApiClient, type GetOptions } from '../../../api/client';
import type { Fetched } from '../../../api/types';
import { articleMeta, findSection, query, sectionsOf, textOf, wikiClient } from '../../../api/wikipedia';
import { validArticle } from '../../../lib/wikiArticle';
import { isPastSeason, seasonArticle } from '../data/seasons';
import { parseFeParticipants, type FeParticipant } from '../domain/participants';
import { parseFeProfile, type FeProfile, type FeProfileKind } from '../domain/profiles';
import { parseRace } from '../domain/race';
import { parseSeason } from '../domain/season';
import type { FeRaceData, FeSeasonData } from '../domain/types';

export { WIKI_API, WIKI_PROVIDER } from '../../../api/wikipedia';

export function createWikipedia(api: ApiClient = wikiClient) {
  const seasons = new Map<string, FeSeasonData>();
  const races = new Map<string, FeRaceData>();
  return {
    async getSeason(id: string, opts: GetOptions = {}): Promise<Fetched<FeSeasonData>> {
      const title = seasonArticle(id);
      const options = { ...opts, immutable: isPastSeason(id) };
      let toc;
      try {
        toc = await api.get(query({ page: title, prop: 'sections' }), options);
      } catch (error) {
        if (!(error instanceof ApiError) || error.kind !== 'parse' || error.message !== 'Статья не найдена')
          throw error;
        return {
          data: { id, article: title, rounds: [], standings: [], unavailable: true },
          meta: articleMeta(
            { provider: 'Википедия', sourceUrl: '', fetchedAt: new Date().toISOString(), stale: false },
            title,
          ),
        };
      }
      const sections = sectionsOf(toc.data);
      const calendar = findSection(sections, /^Calendar$/i, true);
      const results = sections.filter(
        (section) =>
          section.toclevel === 1 &&
          /^(Results and standings|Race results|Championship standings)$/i.test(section.line),
      );
      const responses = await Promise.all(
        [calendar, ...results].map((section) =>
          section ? api.get(query({ page: title, prop: 'text', section: section.index }), options) : null,
        ),
      );
      const [cal, ...res] = responses;
      const key = `${id}|${responses.map((response) => response?.meta.fetchedAt ?? '').join('|')}`;
      let data = seasons.get(key);
      if (!data) {
        data = parseSeason(
          id,
          title,
          cal ? textOf(cal.data) : '',
          res.map((value) => (value ? textOf(value.data) : '')).join('\n'),
        );
        seasons.set(key, data);
      }
      return {
        data,
        meta: articleMeta(
          [toc, ...responses].find((response) => response?.meta.stale)?.meta ??
            (res.at(-1) ?? cal ?? toc).meta,
          title,
        ),
      };
    },
    async getParticipants(
      id: string,
      drivers: boolean,
      opts: GetOptions = {},
    ): Promise<Fetched<FeParticipant[]>> {
      const title = seasonArticle(id);
      const options = { ...opts, immutable: isPastSeason(id) };
      const toc = await api.get(query({ page: title, prop: 'sections' }), options);
      const section = findSection(sectionsOf(toc.data), /^Teams and drivers$/i, true);
      if (!section) return { data: [], meta: articleMeta(toc.meta, title) };
      const res = await api.get(query({ page: title, prop: 'text', section: section.index }), options);
      return { data: parseFeParticipants(textOf(res.data), drivers), meta: articleMeta(res.meta, title) };
    },
    async getProfile(title: string, kind: FeProfileKind, opts: GetOptions = {}): Promise<Fetched<FeProfile>> {
      if (!validArticle(title)) throw new Error('Недопустимое название статьи');
      // A career article keeps changing even when opened from a past season.
      const res = await api.get(query({ page: title, prop: 'text' }), { ...opts, immutable: false });
      const canonical = (res.data as { parse: { title?: string } }).parse.title ?? title;
      return {
        data: parseFeProfile(canonical, textOf(res.data), kind),
        meta: articleMeta(res.meta, canonical),
      };
    },
    async getRace(title: string, seasonId: string, opts: GetOptions = {}): Promise<Fetched<FeRaceData>> {
      if (!validArticle(title)) throw new Error('Недопустимое название статьи');
      const response = await api.get(query({ page: title, prop: 'text' }), {
        ...opts,
        immutable: isPastSeason(seasonId),
      });
      const key = `${title}|${response.meta.fetchedAt}`;
      let data = races.get(key);
      if (!data) {
        data = parseRace(title, textOf(response.data));
        races.set(key, data);
      }
      return { data, meta: articleMeta(response.meta, title) };
    },
  };
}

export const wikipedia = createWikipedia();
