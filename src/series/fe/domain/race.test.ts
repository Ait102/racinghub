import berlin from '../__fixtures__/race-2025-berlin.html?raw';
import single from '../__fixtures__/race-2025-sao-paulo.html?raw';
import london from '../__fixtures__/race-2026-london.html?raw';
import double from '../__fixtures__/race-2026-monaco.html?raw';
import { parseRace } from './race';

describe('Formula E race articles', () => {
  const sao = parseRace('2025 São Paulo ePrix', single);
  const monaco = parseRace('2026 Monaco ePrix', double);
  const later = parseRace('Multi-race regression', double.replace('>Race 2</h3>', '>Race 3</h3>'));
  const londonRace = parseRace('2026 London ePrix', london);

  it('reads the published single race classification without calculating points', () => {
    expect(sao.races).toHaveLength(1);
    expect(sao.races[0].raceNumber).toBeNull();
    expect(sao.races[0].classification).toHaveLength(20);
    expect(sao.races[0].classification[0]).toMatchObject({
      pos: 1,
      posText: '1',
      number: '27',
      driver: { name: 'Jake Dennis', article: 'Jake Dennis' },
      team: { name: 'Andretti-Porsche' },
      laps: '30',
      grid: '1',
    });
    expect(sao.races[0].classification.some((r) => r.posText === 'DNF' && r.pos === null)).toBe(true);
    expect(sao.races[0].classification[0].points).toBeTruthy();
  });

  it('keeps both races and every qualifying block within the correct race', () => {
    expect(monaco.races.map((r) => r.raceNumber)).toEqual([1, 2]);
    expect(monaco.races.map((r) => r.classification.length)).toEqual([20, 20]);
    expect(monaco.races[0].classification[0]).toMatchObject({
      driver: { name: 'Nyck de Vries' },
      number: '21',
      laps: '29',
      time: '51:26.313',
      grid: '2',
      points: '25',
    });
    expect(monaco.races[1].classification[0]).toMatchObject({
      driver: { name: 'Oliver Rowland' },
      number: '1',
      time: '45:43.102',
      grid: '8',
      points: '25+1²',
    });
    for (const race of monaco.races) {
      expect(race.qualifying.map((q) => q.kind)).toEqual(['groups', 'duels', 'classification']);
      expect(race.qualifying.find((q) => q.kind === 'classification')?.rows).toHaveLength(20);
    }
    expect(monaco.races[0].qualifying[0].rows[0][1]).toMatch(/^WEH · MOR/);
    expect(monaco.races[1].qualifying[0].rows[0][1]).toMatch(/^EVA · MOR/);
    expect(monaco.races[0].qualifying[2].rows[0]).toContain('1:26.551');
    expect(monaco.races[1].qualifying[2].rows[0]).toContain('1:26.222');
  });

  it('retains source duel stages and entrants, including the final', () => {
    const duels1 = monaco.races[0].qualifying.find((q) => q.kind === 'duels')!;
    const duels2 = monaco.races[1].qualifying.find((q) => q.kind === 'duels')!;
    expect(duels1.columns).toEqual(['Quarter-finals', 'Semi-finals', 'Final']);
    expect(duels1.rows[0][0]).toBe('A2 Maximilian Günther');
    expect(duels1.rows[1][0]).toBe('A3 Nico Müller');
    expect(duels1.rows.map((r) => r[2]).filter(Boolean)).toEqual(['Dan Ticktum', 'Nyck de Vries']);
    expect(duels2.rows.map((r) => r[2]).filter(Boolean)).toEqual(['Dan Ticktum', 'António Félix da Costa']);
    expect(sao.races[0].qualifying.some((q) => q.kind === 'duels' && q.rows.length > 0)).toBe(true);
  });

  it('keeps later numbered races separate in events with more than two races', () => {
    // Derivative of the genuine fixture: only the second race heading changes.
    expect(later.races.map((race) => race.raceNumber)).toEqual([1, 3]);
    expect(later.races[0].classification[0].driver?.name).toBe('Nyck de Vries');
    expect(later.races[1].classification[0].driver?.name).toBe('Oliver Rowland');
    expect(later.races[1].qualifying).toHaveLength(3);
  });

  it('keeps both classifications and qualifying results when the report spells out race numbers', () => {
    const { races } = parseRace('2025 Berlin ePrix', berlin);
    expect(races.map((race) => race.raceNumber)).toEqual([1, 2]);
    expect(races.map((race) => race.classification[0]?.driver?.name)).toEqual([
      'Mitch Evans',
      'Nick Cassidy',
    ]);
    expect(races.map((race) => race.qualifying[0]?.rows[0]?.[2])).toEqual(['Mitch Evans', 'Pascal Wehrlein']);
  });

  it('uses the actual race infobox for track facts and provides the article lead', () => {
    expect(sao.circuit).toEqual({
      location: 'São Paulo Street Circuit, São Paulo, Brazil',
      course: 'Street Circuit',
      length: '2.933 km (1.822 mi)',
    });
    expect(monaco.circuit?.length).toBe('3.337 km (2.074 mi)');
    expect(monaco.description).toContain('2026 Monaco ePrix');
  });

  it('keeps London infobox podiums separate from its unpublished full protocols', () => {
    const data = londonRace;
    expect(data.races.map((race) => race.raceNumber)).toEqual([1, 2]);
    expect(data.races.map((race) => race.classification)).toEqual([[], []]);
    expect(data.races[0].podium?.map((row) => row.driver.name)).toEqual([
      'Pascal Wehrlein',
      'Jake Dennis',
      'António Félix da Costa',
    ]);
    expect(data.races[1].podium?.map((row) => [row.pos, row.driver.name, row.team?.name])).toEqual([
      [1, 'Taylor Barnard', 'DS Penske'],
      [2, 'Nyck de Vries', 'Mahindra'],
      [3, 'Edoardo Mortara', 'Mahindra'],
    ]);
  });

  it('does not create results or a track when the source contains none', () => {
    expect(parseRace('Missing results', '<p>No results have been published.</p>')).toMatchObject({
      article: 'Missing results',
      circuit: null,
      races: [],
    });
  });
});
