import { isPastSeason, isSeasonId, seasonArticle, seasonEndYear, wecSeasons } from '../data/seasons';
import { normalizeClass } from './parse';
import { daysUntil, isLeMans, lastCompleted, nextRound, roundStatus } from './status';
import type { WecRound } from './types';

const NOW = new Date(2026, 5, 13, 15); // 13 June 2026, during Le Mans

const round = (n: number, start: string | null, end = start, won = false): WecRound => ({
  round: n,
  name: n === 3 ? '24 Hours of Le Mans' : `Round ${n}`,
  circuit: null,
  location: null,
  country: null,
  dateText: start ?? 'TBA',
  start,
  end,
  report: null,
  winners: won ? [{ cls: 'Hypercar', number: '7', team: null, drivers: [] }] : [],
});

describe('WEC seasons', () => {
  it('lists every season since 2012 with the two super seasons', () => {
    const ids = wecSeasons(NOW);
    expect(ids[0]).toBe('2026');
    expect(ids[ids.length - 1]).toBe('2012');
    expect(ids).toContain('2018-19');
    expect(ids).toContain('2019-20');
    expect(ids).not.toContain('2018');
    expect(ids).not.toContain('2020');
    expect(ids).toHaveLength(14);
  });

  it('validates ids and names the Wikipedia article', () => {
    expect(isSeasonId('2019-20', NOW)).toBe(true);
    expect(isSeasonId('2020', NOW)).toBe(false);
    expect(isSeasonId('2027', NOW)).toBe(false);
    expect(seasonArticle('2018-19')).toBe('2018–19 FIA World Endurance Championship');
    expect(seasonEndYear('2019-20')).toBe(2020);
    expect(isPastSeason('2025', NOW)).toBe(true);
    expect(isPastSeason('2026', NOW)).toBe(false);
  });
});

describe('WEC round status', () => {
  it('is completed only with a published result', () => {
    expect(roundStatus(round(1, '2026-04-19', '2026-04-19', true), NOW)).toBe('completed');
    expect(roundStatus(round(2, '2026-05-09'), NOW)).toBe('awaiting');
    expect(roundStatus(round(3, '2026-06-13', '2026-06-14'), NOW)).toBe('live');
    expect(roundStatus(round(4, '2026-07-12'), NOW)).toBe('upcoming');
    expect(roundStatus(round(5, null), NOW)).toBe('unknown');
  });

  it('finds the next and the last completed round', () => {
    const rounds = [
      round(1, '2026-04-19', '2026-04-19', true),
      round(3, '2026-06-13', '2026-06-14'),
      round(4, '2026-07-12'),
    ];
    expect(nextRound(rounds, NOW)?.round).toBe(3);
    expect(lastCompleted(rounds)?.round).toBe(1);
    expect(daysUntil(rounds[2], NOW)).toBe(29);
    expect(isLeMans(rounds[1])).toBe(true);
    expect(isLeMans({ name: '24 Heures du Mans' })).toBe(true);
    expect(isLeMans({ name: '6 Hours of Spa' })).toBe(false);
  });

  it('spells a class one way', () => {
    expect(normalizeClass('LMP2(Pro-Am)')).toBe('LMP2 Pro-Am');
    expect(normalizeClass(' LMP2  Pro-Am ')).toBe('LMP2 Pro-Am');
    expect(normalizeClass('LMGTE Am')).toBe('LMGTE Am');
  });
});
