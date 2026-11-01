import buemi from '../__fixtures__/driver-buemi.html?raw';
import kobayashi from '../__fixtures__/driver-kobayashi.html?raw';
import { compareSeasons } from './compare';
import { parseProfile } from './profiles';

describe('WEC career comparison', { timeout: 20_000 }, () => {
  const a = () => parseProfile('Sébastien Buemi', buemi, 'driver');
  const b = () => parseProfile('Kamui Kobayashi', kobayashi, 'driver');

  it('pairs the union of WEC seasons, retaining source text and super seasons', () => {
    const pairs = compareSeasons(a(), b());
    expect(pairs[0].season).toBe('2026');
    expect(pairs[0].a[0]).toMatchObject({
      position: '1st*',
      points: '114*',
      cls: 'Hypercar',
      team: 'Toyota Racing',
    });
    expect(pairs[0].b[0]).toMatchObject({ position: '2nd*', points: '97*' });
    expect(pairs.find((p) => p.season === '2013')?.a[0].points).toBe('106.25');
    expect(pairs.find((p) => p.season === '2013')?.b[0].cls).toBe('LMGTE Pro');
    expect(pairs.find((p) => p.season === '2018-19')).toBeDefined();
    expect(pairs.at(-1)?.season).toBe('2012');
    expect(pairs.at(-1)?.b).toEqual([]);
    // Le Mans has a standalone 2020 row; WEC only has the 2019–20 super season.
    expect(pairs.some((p) => p.season === '2020')).toBe(false);
  });

  it('keeps multiple entries per season instead of summing points or picking one class', () => {
    const html =
      '<h3>Complete FIA World Endurance Championship results</h3><table class="wikitable"><tr><th>Year</th><th>Class</th><th>Team</th><th>Pts.</th><th>Pos.</th></tr><tr><td rowspan="2">2024</td><td>LMP2</td><td>A</td><td>10.5</td><td>2nd</td></tr><tr><td>LMGT3</td><td>B</td><td>20 (25)</td><td>3rd</td></tr></table>';
    const pairs = compareSeasons(parseProfile('x', html, 'driver'), parseProfile('y', '', 'driver'));
    expect(pairs).toEqual([
      {
        season: '2024',
        a: [
          { cls: 'LMP2', team: 'A', position: '2nd', points: '10.5' },
          { cls: 'LMGT3', team: 'B', position: '3rd', points: '20 (25)' },
        ],
        b: [],
      },
    ]);
  });

  it('leaves missing columns unknown and does not infer a season result from Le Mans', () => {
    const html =
      '<h3>Complete FIA World Endurance Championship results</h3><table class="wikitable"><tr><th>Year</th><th>Entrant</th></tr><tr><td>2024</td><td>Team</td></tr></table>';
    const p = parseProfile('x', html, 'driver');
    expect(compareSeasons(p, parseProfile('y', '', 'driver'))[0].a[0]).toEqual({
      team: 'Team',
      cls: null,
      position: null,
      points: null,
    });
    expect(compareSeasons(parseProfile('x', '', 'driver'), parseProfile('y', '', 'driver'))).toEqual([]);
  });
});
