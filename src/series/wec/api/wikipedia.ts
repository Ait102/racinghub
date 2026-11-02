// WEC data from English Wikipedia (MediaWiki parse API, CC BY-SA 4.0).
// The season article is read in two sections only (calendar, results and standings)
// to keep downloads small; a race article is read whole.
import type { ApiClient, GetOptions } from '../../../api/client';
import type { Fetched } from '../../../api/types';
import { articleMeta, findSection, query, sectionsOf, textOf, wikiClient } from '../../../api/wikipedia';
import { isPastSeason, seasonArticle } from '../data/seasons';
import { parseRace, parseSeason } from '../domain/parse';
import { parseParticipants, type Participant } from '../domain/participants';
import { parseProfile, validArticle, type ProfileKind, type WecProfile } from '../domain/profiles';
import type { WecRaceData, WecSeasonData } from '../domain/types';

export { articleUrl, WIKI_API, WIKI_PROVIDER } from '../../../api/wikipedia';

// Parsing a season takes a moment: keep the result per downloaded copy.
const parsedSeasons = new Map<string, WecSeasonData>();
const parsedRaces = new Map<string, WecRaceData>();

export function createWikipedia(api: ApiClient = wikiClient) {
  return {
    async getParticipants(
      id: string,
      drivers: boolean,
      opts: GetOptions = {},
    ): Promise<Fetched<Participant[]>> {
      const title = seasonArticle(id);
      const options = { ...opts, immutable: isPastSeason(id) };
      const toc = await api.get(query({ page: title, prop: 'sections' }), options);
      const sections = sectionsOf(toc.data);
      const section = findSection(sections, /^(Entries|Entry list|Teams and drivers)$/i);
      const res = section
        ? await api.get(query({ page: title, prop: 'text', section: section.index }), options)
        : toc;
      return {
        data: section ? parseParticipants(textOf(res.data), drivers) : [],
        meta: articleMeta(res.meta.stale ? res.meta : toc.meta.stale ? toc.meta : res.meta, title),
      };
    },
    async getProfile(title: string, kind: ProfileKind, opts: GetOptions = {}): Promise<Fetched<WecProfile>> {
      if (!validArticle(title)) throw new Error('Недопустимое название статьи');
      // A career article keeps changing even when opened from a past season.
      const res = await api.get(query({ page: title, prop: 'text' }), { ...opts, immutable: false });
      const canonical = (res.data as { parse: { title?: string } }).parse.title ?? title;
      return {
        data: parseProfile(canonical, textOf(res.data), kind),
        meta: articleMeta(res.meta, canonical),
      };
    },
    async getSeason(id: string, opts: GetOptions = {}): Promise<Fetched<WecSeasonData>> {
      const title = seasonArticle(id);
      const o: GetOptions = { ...opts, immutable: isPastSeason(id) };
      const toc = await api.get(query({ page: title, prop: 'sections' }), o);
      const sections = sectionsOf(toc.data);
      const cal = findSection(sections, /^(Calendar|Schedule)/i, true);
      const res = findSection(sections, /^Results/i, true);
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
