// @vitest-environment jsdom
// Live English Wikipedia checks, run separately with npm run test:contract.
import { describe, expect, it } from 'vitest';

import { createClient } from '../../../api/client';
import { createWikipedia, WIKI_API, WIKI_PROVIDER } from '../api/wikipedia';

const wiki = createWikipedia(
  createClient({
    baseUrl: WIKI_API,
    provider: WIKI_PROVIDER,
    storage: null,
    minIntervalMs: 1000,
    timeoutMs: 30_000,
    validate: (json) => ((json as { parse?: unknown })?.parse ? null : 'no parse'),
  }),
);

describe('Википедия: Formula E', () => {
  for (const id of ['2014-15', '2019-20', '2025-26']) {
    it(`сезон ${id}: календарь, победители, исходные очки и двойные колонки`, async () => {
      const season = (await wiki.getSeason(id)).data;
      expect(season.rounds.length).toBeGreaterThanOrEqual(11);
      expect(season.rounds.every((round) => !!round.start && !!round.winner && !!round.report)).toBe(true);
      expect(season.standings.some((table) => table.kind === 'drivers')).toBe(true);
      expect(season.standings.some((table) => table.kind === 'teams')).toBe(true);
      for (const table of season.standings) {
        expect(table.rounds).toHaveLength(season.rounds.length);
        expect(table.rows[0].pos).toBe(1);
        expect(table.rows[0].points).toMatch(/^\d/);
      }
    });
  }
  for (const [article, count] of [
    ['2025 São Paulo ePrix', 1],
    ['2026 Monaco ePrix', 2],
  ] as const) {
    it(`${article}: все протоколы и квалификация`, async () => {
      const race = (await wiki.getRace(article, '2025-26')).data;
      expect(race.races).toHaveLength(count);
      for (const session of race.races) {
        expect(session.classification.length).toBeGreaterThanOrEqual(20);
        expect(session.classification[0].pos).toBe(1);
        expect(session.classification[0].points).toMatch(/^\d/);
        expect(session.qualifying.length).toBeGreaterThan(0);
      }
    });
  }
});
