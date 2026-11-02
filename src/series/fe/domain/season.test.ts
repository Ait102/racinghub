import { placeSeries } from '../../../lib/places';
import { parseStandings } from '../../../lib/wikiStandings';
import { parseHtml } from '../../../lib/wikitable';
import cal1415 from '../__fixtures__/season-2014-15-calendar.html?raw';
import res1415 from '../__fixtures__/season-2014-15-results.html?raw';
import cal1920 from '../__fixtures__/season-2019-20-calendar.html?raw';
import res1920 from '../__fixtures__/season-2019-20-results.html?raw';
import cal2526 from '../__fixtures__/season-2025-26-calendar.html?raw';
import res2526 from '../__fixtures__/season-2025-26-results.html?raw';
import { parseDate, parseSeason } from './season';

const firstSeason = parseSeason('2014-15', 'Article', cal1415, res1415);
const covidSeason = parseSeason('2019-20', 'Article', cal1920, res1920);
const modernSeason = parseSeason('2025-26', 'Article', cal2526, res2526);

describe('Formula E genuine season articles', () => {
  it.each([
    ['2014-15', firstSeason, 11, 2],
    ['2019-20', covidSeason, 11, 2],
    ['2025-26', modernSeason, 17, 3],
  ] as const)('reads %s calendar, source winners and standings', (id, season, count, tables) => {
    expect(season.rounds).toHaveLength(count);
    expect(season.rounds.every((round) => !!round.start && !!round.winner && !!round.report)).toBe(true);
    expect(season.standings).toHaveLength(tables);
    expect(season.standings[0].rounds).toHaveLength(count);
    expect(season.standings[0].rows[0].pos).toBe(1);
    expect(season.rounds[0].start).toMatch(new RegExp(`^${id.slice(0, 4)}-`));
  });

  it('keeps double headers separate with their exact source dates and common report', () => {
    const season = modernSeason;
    const monaco = season.rounds.filter((round) => round.name === 'Monaco ePrix');
    expect(monaco.map((round) => [round.round, round.raceNumber, round.start, round.report])).toEqual([
      [9, 1, '2026-05-16', '2026 Monaco ePrix'],
      [10, 2, '2026-05-17', '2026 Monaco ePrix'],
    ]);
    expect(season.rounds[0]).toMatchObject({
      winner: { name: 'Jake Dennis' },
      pole: { name: 'Pascal Wehrlein' },
      fastestLap: { name: 'Norman Nato' },
    });
    const teams = season.standings.find((table) => table.kind === 'teams')!;
    expect(teams.rows[0]).toMatchObject({
      name: { name: 'Jaguar TCS Racing' },
      points: '288',
      lineLabels: ['9', '13'],
    });
    expect(teams.rows[0].lines).toHaveLength(2);
    expect(teams.rows[0].lines.every((line) => line.length === 17)).toBe(true);
  });

  it('retains original annotations and recognizes their finishing places in the chart', () => {
    const season = covidSeason;
    const drivers = season.standings[0];
    expect(drivers.rows[0].points).toBe('158');
    expect(drivers.rows[0].lines[0][1]).toMatchObject({ text: '10G*', place: 10 });
    expect(placeSeries(drivers, 1)[0].places).toEqual([14, 10, 2, 2, 1, 1, 1, 4, 2, null, 9]);
  });

  it('excludes the repeated source column headers from championship participants', () => {
    const drivers = modernSeason.standings.find((table) => table.kind === 'drivers')!;
    expect(drivers.rows).toHaveLength(20);
    for (const table of modernSeason.standings) {
      expect(table.rows.every((row) => !/^Pos\.?$/i.test(row.posText))).toBe(true);
      expect(table.rows.some((row) => row.name.name === table.nameHeader)).toBe(false);
    }
  });

  it('preserves missing winners and unknown dates without inventing them', () => {
    const season = parseSeason('2025-26', 'Article', cal2526, '');
    expect(season.rounds[0]).toMatchObject({ winner: null, pole: null, fastestLap: null, report: null });
    expect(season.standings).toEqual([]);
    expect(parseDate('TBA')).toBeNull();
    expect(parseDate('31 February 2026')).toBeNull();
  });

  it('keeps statuses and empty races as chart gaps, while removing only superscript notes', () => {
    const html = `<h3>Drivers' Championship</h3><table class="wikitable"><tr><th>Pos.</th><th>Driver</th>${['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((name) => `<th><a href="/wiki/Test">${name}</a></th>`).join('')}<th>Pts</th></tr><tr><th>1</th><td>Driver</td><td>1<sup>P</sup></td><td>Ret</td><td>DNS</td><td>DSQ</td><td>NC</td><td></td><td>2<sup>F</sup></td><th>25</th></tr></table>`;
    const table = parseStandings(parseHtml(html), undefined, { series: 'fe' })[0];
    expect(table.rows[0].lines[0].map((cell) => cell.text)).toEqual([
      '1P',
      'Ret',
      'DNS',
      'DSQ',
      'NC',
      '',
      '2F',
    ]);
    expect(placeSeries(table, 1)[0].places).toEqual([1, null, null, null, null, null, 2]);
  });
});
