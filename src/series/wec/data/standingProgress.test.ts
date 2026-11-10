import { describe, expect, it } from 'vitest';

import results from '../__fixtures__/season-2026-results.html?raw';
import { parseStandings } from '../domain/parse';
import { wecStandingProgress } from './standingProgress';

const tables = parseStandings(new DOMParser().parseFromString(results, 'text/html'));

describe('wecStandingProgress', () => {
  it('uses the published Hypercar standings after each completed round', () => {
    const progress = wecStandingProgress('2026', tables[0]);

    expect(progress?.rounds.map(({ label }) => label)).toEqual([
      'IMO',
      'SPA',
      'LMS',
      'SÃO',
      'COA',
      'FUJ',
      'CAT',
      'MNZ',
    ]);
    expect(progress?.series.find(({ label }) => label === 'Sébastien Buemi')?.points).toEqual([
      25, 26, 56, 56, 64, 89, 114, 115,
    ]);
  });
});
