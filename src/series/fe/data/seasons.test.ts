import { describe, expect, it } from 'vitest';

import { feSeasons, isPastSeason, isSeasonId, seasonArticle } from './seasons';

describe('Formula E seasons', () => {
  const now = new Date('2026-11-02T12:00:00Z');

  it('lists seasons from 2014–15 through the starting calendar year', () => {
    const seasons = feSeasons(now);
    expect(seasons).toHaveLength(13);
    expect(seasons[0]).toBe('2026-27');
    expect(seasons.at(-1)).toBe('2014-15');
    expect(isSeasonId('2025-26', now)).toBe(true);
    for (const id of ['2013-14', '2026', '2026-28', '2027-28', undefined]) {
      expect(isSeasonId(id, now)).toBe(false);
    }
  });

  it('uses the World Championship name from 2020–21', () => {
    expect(seasonArticle('2014-15')).toBe('2014–15 Formula E Championship');
    expect(seasonArticle('2019-20')).toBe('2019–20 Formula E Championship');
    expect(seasonArticle('2020-21')).toBe('2020–21 Formula E World Championship');
    expect(seasonArticle('2026-27')).toBe('2026–27 Formula E World Championship');
  });

  it('keeps the ending calendar year mutable', () => {
    expect(isPastSeason('2024-25', now)).toBe(true);
    expect(isPastSeason('2025-26', now)).toBe(false);
    expect(isPastSeason('2026-27', now)).toBe(false);
  });
});
