import buemi from '../__fixtures__/driver-buemi.html?raw';
import kobayashi from '../__fixtures__/driver-kobayashi.html?raw';
import spa from '../__fixtures__/event-spa.html?raw';
import afCorse from '../__fixtures__/team-af-corse.html?raw';
import toyota from '../__fixtures__/team-toyota.html?raw';
import { parseProfile, profileStats, validArticle } from './profiles';

describe('Wikipedia WEC profiles', { timeout: 20_000 }, () => {
  it('reads driver career and Le Mans separately, retaining source points and super seasons', () => {
    const p = parseProfile('Sébastien Buemi', buemi, 'driver');
    expect(p.tables.map((t) => t.kind)).toEqual(['lemans', 'wec']);
    const career = p.tables.find((t) => t.kind === 'wec')!;
    expect(career.rows[0].cells.map((c) => c.text)).toContain('0');
    expect(career.rows.some((r) => r.season === '2018-19')).toBe(true);
    expect(career.rows.find((r) => r.season === '2013')!.cells.some((c) => c.text === '106.25')).toBe(true);
    expect(career.rows.find((r) => r.season === '2026')!.cells.some((c) => c.text === '114*')).toBe(true);
    expect(
      career.rows[1].cells.some((c) => c.links.some((l) => l.article === '2013 6 Hours of Silverstone')),
    ).toBe(true);
  });

  it('does not count the ongoing title and counts Le Mans class places rather than overall places', () => {
    const p = parseProfile('Sébastien Buemi', buemi, 'driver');
    const stats = profileStats(p, new Date('2026-11-02'));
    expect(stats.titles).toBe(4);
    expect(stats.seasons).toBe(14);
    expect(stats.leMansWins).toBe(4);
    expect(stats.leMansPodiums).toBeGreaterThan(stats.leMansWins!);
    const k = parseProfile('Kamui Kobayashi', kobayashi, 'driver');
    expect(profileStats(k, new Date('2026-11-02')).leMansWins).toBe(2);
  });

  it('keeps team car rows, shared year cells, and points before position', () => {
    const p = parseProfile('Toyota Racing GmbH', toyota, 'team');
    const t = p.tables.find((t) => t.kind === 'wec')!;
    expect(t.rows.filter((r) => r.season === '2012')).toHaveLength(2);
    expect(t.rows[0].cells.slice(-2).map((c) => c.text)).toEqual(['96', '2nd']);
    expect(t.rows[1].cells.slice(-2).map((c) => c.text)).toEqual(['96', '2nd']);
    expect(
      parseProfile('AF Corse', afCorse, 'team')
        .tables[0].rows[0].cells.slice(-2)
        .map((c) => c.text),
    ).toEqual(['108', '4th']);
  });

  it('reads actual event winners and skips full-width configuration headings', () => {
    const p = parseProfile('6 Hours of Spa-Francorchamps', spa, 'circuit');
    expect(p.tables.length).toBeGreaterThan(0);
    expect(p.tables[0].rows[0].season).toBe('1953');
    expect(p.tables.flatMap((t) => t.rows).some((r) => r.season === '2025')).toBe(true);
    expect(p.tables.flatMap((t) => t.rows).every((r) => /^\d{4}/.test(r.season))).toBe(true);
  });

  it('does not guess missing tables, class places or titles from unrelated championships', () => {
    const html =
      '<h3>Formula One results</h3><table class="wikitable"><tr><th>Year</th><th>Pos.</th></tr><tr><td>2024</td><td>1st</td></tr></table>';
    expect(parseProfile('x', html, 'driver').tables).toEqual([]);
    expect(profileStats(parseProfile('x', '', 'driver')).leMansWins).toBeNull();
  });

  it('accepts article titles with accents and slashes, rejects namespaces and invalid titles', () => {
    expect(validArticle('Sébastien Buemi')).toBe(true);
    expect(validArticle('Porsche 963/History')).toBe(true);
    for (const v of ['', 'File:Example.jpg', 'Special:Search', 'A#B', 'A\nB', 'x'.repeat(256)])
      expect(validArticle(v)).toBe(false);
  });

  it('does not turn missing championship positions into zero titles', () => {
    const p = parseProfile(
      'x',
      '<h3>Complete FIA World Endurance Championship results</h3><table class="wikitable"><tr><th>Year</th><th>Team</th></tr><tr><td>2024</td><td>Team</td></tr></table>',
      'driver',
    );
    expect(profileStats(p).titles).toBeNull();
  });
});
