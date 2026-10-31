// @vitest-environment jsdom
// Contract checks against LIVE English Wikipedia (not part of `npm test`).
// They fail when the WEC articles change in a way our parser no longer understands:
// renamed sections, reordered columns, a different table layout.
// Run: npm run test:contract
import { describe, expect, it } from 'vitest';

import { createClient } from '../../../api/client';
import { createWikipedia, WIKI_API, WIKI_PROVIDER } from '../api/wikipedia';
import { wecSeasons } from '../data/seasons';

const client = createClient({
  baseUrl: WIKI_API,
  provider: WIKI_PROVIDER,
  storage: null,
  minIntervalMs: 300,
  timeoutMs: 30_000,
  validate: (j) => ((j as { parse?: unknown })?.parse ? null : 'no parse'),
});
const wiki = createWikipedia(client);

/** First season, a two-year super season and the newest one cover all layouts. */
const SEASONS = ['2012', '2019-20', wecSeasons()[0]];

describe('Википедия: статьи сезонов WEC', () => {
  for (const id of SEASONS) {
    it(`сезон ${id}: календарь, победители и зачёты разбираются`, async () => {
      const s = (await wiki.getSeason(id)).data;
      expect(s.rounds.length, 'нет этапов — раздел Calendar/Schedule изменился').toBeGreaterThanOrEqual(4);
      for (const r of s.rounds) {
        expect(r.name, `у этапа ${r.round} нет названия`).toBeTruthy();
        expect(r.start, `дата этапа ${r.round} «${r.dateText}» не прочитана`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
      expect(s.classes.length, 'нет классов в сводке победителей').toBeGreaterThanOrEqual(2);
      const done = s.rounds.filter((r) => r.winners.length > 0);
      expect(
        done.length,
        'ни у одного этапа нет победителей — сводка Race results изменилась',
      ).toBeGreaterThan(0);
      for (const r of done) {
        expect(r.report, `у этапа ${r.round} нет ссылки на статью о гонке`).toBeTruthy();
        expect(r.winners[0].drivers.length, `у победителя этапа ${r.round} нет экипажа`).toBeGreaterThan(0);
      }
      expect(
        s.standings.some((t) => t.kind === 'drivers'),
        'нет зачёта пилотов',
      ).toBe(true);
      for (const t of s.standings) {
        expect(t.rounds.length, `в зачёте «${t.title}» нет колонок этапов`).toBeGreaterThan(0);
        expect(t.rows[0].pos, `в зачёте «${t.title}» нет первого места`).toBe(1);
      }
    });
  }
});

describe('Википедия: статья о гонке', () => {
  it('протокол Ле-Мана прошлого года: классы, экипажи, круги', async () => {
    const lastYear = String(new Date().getFullYear() - 1);
    const s = (await wiki.getSeason(lastYear)).data;
    const lm = s.rounds.find((r) => /Le Mans/i.test(r.name) && r.report);
    expect(lm, 'в календаре нет Ле-Мана со статьёй').toBeTruthy();
    const race = (await wiki.getRace(lm!.report!, lastYear)).data;
    expect(race.classification.length, 'протокол не найден или пуст').toBeGreaterThan(30);
    const first = race.classification[0];
    expect(first.pos).toBe(1);
    expect(first.drivers.length).toBeGreaterThanOrEqual(2);
    expect(first.laps, 'круги не прочитаны').toBeGreaterThan(300);
    expect(
      new Set(race.classification.map((e) => e.cls)).size,
      'в Ле-Мане несколько классов',
    ).toBeGreaterThan(1);
  });
});
