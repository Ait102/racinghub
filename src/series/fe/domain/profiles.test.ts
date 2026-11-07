// Real (trimmed) Wikipedia articles: a driver, a team, an E-Prix and three eras of entry lists.
import wehrlein from '../__fixtures__/driver-wehrlein.html?raw';
import monaco from '../__fixtures__/eprix-monaco.html?raw';
import entries1415 from '../__fixtures__/season-2014-15-entries.html?raw';
import entries1920 from '../__fixtures__/season-2019-20-entries.html?raw';
import entries2526 from '../__fixtures__/season-2025-26-entries.html?raw';
import jaguar from '../__fixtures__/team-jaguar.html?raw';
import { parseFeParticipants } from './participants';
import { feProfileStats, parseFeProfile, seasonResults, summaryColumns } from './profiles';

describe('Formula E entry lists', { timeout: 20_000 }, () => {
  it.each([entries2526, entries1920, entries1415])('reads drivers and teams across rowspans', (html) => {
    const drivers = parseFeParticipants(html, true);
    const teams = parseFeParticipants(html, false);
    expect(drivers.length).toBeGreaterThan(18);
    expect(teams.length).toBeGreaterThan(8);
    expect(new Set(drivers.map((d) => d.who.article ?? d.who.name)).size).toBe(drivers.length);
    expect(drivers.every((d) => d.partners.length > 0)).toBe(true);
  });

  it('keeps numbers, team and powertrain of a 2025–26 entry', () => {
    const rowland = parseFeParticipants(entries2526, true).find((d) => d.who.name === 'Oliver Rowland')!;
    expect(rowland.numbers).toEqual(['1']);
    expect(rowland.partners[0].name).toBe('Nissan Formula E Team');
    expect(rowland.powertrains).toEqual(['Nissan e-4ORCE 05']);
    const nissan = parseFeParticipants(entries2526, false).find(
      (t) => t.who.name === 'Nissan Formula E Team',
    )!;
    expect(nissan.partners.map((d) => d.name)).toEqual(
      expect.arrayContaining(['Oliver Rowland', 'Norman Nato']),
    );
    expect(nissan.lineup.map(({ number, driver }) => [number, driver?.name])).toEqual(
      expect.arrayContaining([
        ['1', 'Oliver Rowland'],
        ['23', 'Norman Nato'],
      ]),
    );
  });
});

describe('Formula E profiles', { timeout: 20_000 }, () => {
  it('reads the driver infobox Formula E figures without other series and the season table', () => {
    const p = parseFeProfile('Pascal Wehrlein', wehrlein, 'driver');
    const labels = p.facts.map((f) => f.label);
    expect(labels).toEqual(expect.arrayContaining(['Родился', 'Дебют в FE', 'Старты', 'Победы', 'Титулы']));
    // The F1 and DTM sections of the infobox have their own "Wins"; only the FE one counts.
    expect(labels.filter((l) => l === 'Победы')).toHaveLength(1);
    expect(p.biography).toMatch(/^Pascal Konrad Wehrlein \(born 18 October/);
    const rows = seasonResults(p);
    expect(rows[0]).toMatchObject({
      season: '2018-19',
      team: 'Mahindra Racing',
      position: '12th',
      points: '58',
    });
    const table = p.tables[0];
    expect(summaryColumns(table).map((i) => table.columns[i])).toEqual([
      'Year',
      'Team',
      'Chassis',
      'Powertrain',
      'Pos',
      'Points',
    ]);
    expect(feProfileStats(p, new Date('2026-11-02')).seasons).toBeGreaterThan(6);
  });

  it('reads team facts and its season rows with the team championship place', () => {
    const p = parseFeProfile('Jaguar Racing (Formula E)', jaguar, 'team');
    expect(p.facts.map((f) => f.label)).toEqual(expect.arrayContaining(['Основана', 'Победы']));
    const rows = seasonResults(p);
    expect(rows.find((r) => r.season === '2016-17')).toMatchObject({ position: '10th', points: '27' });
    // Each driver row repeats the season; the summary shows it once.
    expect(rows.filter((r) => r.season === '2016-17')).toHaveLength(1);
    expect(p.facts.some((f) => /TBA/.test(f.value))).toBe(false);
  });

  it('reads E-Prix winners by edition', () => {
    const p = parseFeProfile('Monaco ePrix', monaco, 'eprix');
    const winners = p.tables.find((t) => t.kind === 'winners')!;
    expect(winners.rows[0].season).toBe('2015');
    const winner = winners.rows[0].cells[winners.columns.indexOf('Winner')];
    // "Driver<br>Team" in the source stays readable.
    expect(winner.text).toMatch(/^Sébastien Buemi · /);
    expect(winners.columns).toContain('Winner');
    expect(p.facts.map((f) => f.label)).toContain('Впервые');
  });
});
