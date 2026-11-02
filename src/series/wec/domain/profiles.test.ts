import buemiIntro from '../__fixtures__/driver-buemi-intro.html?raw';
import buemi from '../__fixtures__/driver-buemi.html?raw';
import kobayashi from '../__fixtures__/driver-kobayashi.html?raw';
import spa from '../__fixtures__/event-spa.html?raw';
import afCorse from '../__fixtures__/team-af-corse.html?raw';
import toyota from '../__fixtures__/team-toyota.html?raw';
import { parseProfile, profileStats, teamCars, validArticle } from './profiles';

describe('Wikipedia WEC profiles', { timeout: 20_000 }, () => {
  it('reads the sourced Buemi infobox, lead and portrait while ignoring its small FIA and flag icons', () => {
    const p = parseProfile('Sébastien Buemi', buemiIntro, 'driver');
    expect(p.facts).toContainEqual({ label: 'Команда в WEC', value: 'Toyota Racing' });
    expect(p.facts).toContainEqual({ label: 'Категория FIA', value: 'FIA Platinum' });
    expect(p.facts).toContainEqual({ label: 'Национальность', value: 'Swiss' });
    expect(p.facts.find((fact) => fact.label === 'Полное имя')?.value).toBe(
      'Sébastien Olivier Humbert Buemi',
    );
    expect(p.facts.find((fact) => fact.label === 'Родился')?.value).toBe(
      '31 October 1988, Aigle, Vaud, Switzerland',
    );
    expect(p.photoFiles).toEqual([
      'Ryo Hirakawa, Brendon Hartley & Sebastien Buemi take the podium for 2nd in Hypercar at the 2023 Le Mans (53468554280) (cropped).jpg',
    ]);
    expect(p.biography).toMatch(/^Sébastien Olivier Humbert Buemi \(born 31 October 1988\) is a Swiss /);
    expect(p.biography).not.toMatch(/pronunciation|\[seb/);
    expect(p.biography).not.toContain('.mw-parser-output');
  });

  it('keeps personal facts, WEC facts and plain lead text without mixing other championship facts', () => {
    const p = parseProfile(
      'Driver',
      `<div class="mw-parser-output"><div class="hatnote">For the other driver, see another page.</div><table class="infobox">
      <tr><th>Born</th><td><span class="birth-name">Full Driver Name</span><br><span class="bday" style="display:none">1988-10-31</span>31 October 1988<br>Aigle, Switzerland<sup class="reference">[1]</sup></td></tr>
      <tr><th colspan="2">FIA World Endurance Championship career</th></tr><tr><th>Debut season</th><td>2012</td></tr><tr><th>Current team</th><td>Toyota Racing</td></tr><tr><th>Car number</th><td>8</td></tr>
      <tr><th colspan="2">Formula One World Championship career</th></tr><tr><th>Nationality</th><td>Swiss</td></tr><tr><th>Car number</th><td>99</td></tr></table>
      <p><b>Full Driver Name</b> is a Swiss racing driver who competes in the FIA World Endurance Championship.<sup class="reference">[2]</sup><script>unsafe()</script></p><h2>Early career</h2><p>This is no longer the lead.</p></div>`,
      'driver',
    );
    expect(p.facts).toEqual([
      { label: 'Полное имя', value: 'Full Driver Name' },
      { label: 'Родился', value: '31 October 1988 Aigle, Switzerland' },
      { label: 'Дебют в WEC', value: '2012' },
      { label: 'Команда в WEC', value: 'Toyota Racing' },
      { label: 'Номер в WEC', value: '8' },
      { label: 'Национальность', value: 'Swiss' },
    ]);
    expect(p.biography).toBe(
      'Full Driver Name is a Swiss racing driver who competes in the FIA World Endurance Championship.',
    );
  });

  it('does not invent missing biography or personal facts from results tables', () => {
    const p = parseProfile('Driver', '<h2>Racing record</h2><p>Unrelated career section.</p>', 'driver');
    expect(p.facts).toEqual([]);
    expect(p.biography).toBeNull();
  });

  it('collects every distinct car across matching team article aliases', () => {
    const car = (name: string, article = name) => ({ name, article, flag: null });
    expect(
      teamCars(
        [
          { who: car('Team', 'Old team title'), categories: ['Hypercar'], cars: [car('Model A')] },
          {
            who: car('Team', 'Canonical team'),
            categories: ['LMGT3'],
            cars: [car('Model B'), car('Model A')],
          },
          { who: car('Other team'), categories: ['Hypercar'], cars: [car('Model C')] },
        ],
        ['Old team title', 'Canonical team'],
      ),
    ).toEqual([car('Model A'), car('Model B')]);
  });

  it('keeps distinct car variants even when Wikipedia links them to one shared article', () => {
    const who = { name: 'Team', article: 'Team', flag: null };
    const original = { name: 'Ferrari 296 GT3', article: 'Ferrari 296', flag: null };
    const evo = { name: 'Ferrari 296 GT3 Evo', article: 'Ferrari 296', flag: null };
    expect(teamCars([{ who, categories: ['LMGT3'], cars: [original, evo] }], ['Team'])).toEqual([
      original,
      evo,
    ]);
  });

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
