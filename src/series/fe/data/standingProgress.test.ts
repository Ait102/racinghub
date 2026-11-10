import { parseStandings, type StandingTable } from '../../../lib/wikiStandings';
import { parseHtml } from '../../../lib/wikitable';
import results from '../__fixtures__/season-2025-26-results.html?raw';
import { feStandingProgress } from './standingProgress';

const tables = parseStandings(parseHtml(results), undefined, { series: 'fe' });
const drivers = tables.find((table) => table.kind === 'drivers')!;

describe('Formula E championship progress', () => {
  it('uses the published cumulative driver totals in official final order', () => {
    const progress = feStandingProgress('2025-26', drivers)!;
    expect(progress.rounds).toHaveLength(17);
    expect(progress.rounds.slice(11, 13).map((round) => round.label)).toEqual(['12', '13']);
    expect(progress.series.slice(0, 3).map((series) => series.label)).toEqual([
      'Pascal Wehrlein',
      'Jake Dennis',
      'Mitch Evans',
    ]);
    expect(progress.series[0].points.slice(11, 13)).toEqual([129, 141]);
    expect(progress.series[0].points.slice(-3)).toEqual([141, 169, 169]);
    expect(progress.series[2].points[0]).toBe(0);
  });

  it.each(tables.map((table) => [table.kind, table] as const))(
    'uses the corresponding FIA %s championship',
    (_, table: StandingTable) => {
      const progress = feStandingProgress('2025-26', table)!;
      expect(progress.series).toHaveLength(table.rows.length);
      expect(progress.series.every((series) => series.points.length === progress.rounds.length)).toBe(true);
      expect(progress.series.map((series) => series.points.at(-1))).toEqual(
        table.rows.map((row) => row.pointsValue),
      );
      expect(progress.sources[0].url).toContain('results.formulae.fia.com');
    },
  );

  it('uses the amended FIA totals for Madrid and Tokyo', () => {
    const teams = tables.find((table) => table.kind === 'teams')!;
    const teamSeries = feStandingProgress('2025-26', teams)!.series;
    const driverSeries = feStandingProgress('2025-26', drivers)!.series;
    expect(teamSeries.find((series) => series.label === 'Porsche Formula E Team')?.points[5]).toBe(133);
    expect(teamSeries.find((series) => series.label === 'Andretti Formula E')?.points[14]).toBe(211);
    expect(driverSeries.find((series) => series.label === 'Felipe Drugovich')?.points[14]).toBe(65);
  });

  it('omits seasons without a verified set of classifications', () => {
    expect(feStandingProgress('2026-27', drivers)).toBeNull();
  });
});
