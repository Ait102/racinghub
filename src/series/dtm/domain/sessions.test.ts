// @vitest-environment node
import results from '../__fixtures__/official-results-2026-r1.json';
import { driverName, parseDtmSessions } from './sessions';

describe('parseDtmSessions', () => {
  const sessions = parseDtmSessions(results);

  it('keeps the DTM sessions of the event in order, without side events', () => {
    expect(sessions.map((s) => s.label)).toEqual([
      'Свободная практика 1',
      'Свободная практика 2',
      'Свободная практика 3',
      'Квалификация 1',
      'Гонка 1',
      'Квалификация 2',
      'Гонка 2',
    ]);
    expect(sessions.every((s) => s.round === 1)).toBe(true);
  });

  it('reads the classification as the timing publishes it', () => {
    const race = sessions.find((s) => s.name === 'Race 1')!;
    expect(race.kind).toBe('race');
    expect(race.start).toBe('2026-04-25T11:30:00.0000000Z');
    expect(race.rows[0]).toMatchObject({
      pos: 1,
      number: '91',
      driver: 'Thomas Preining',
      team: 'Manthey',
      time: '1:00:11.576',
      laps: 38,
      bestLap: '1:28.899',
      points: '26',
    });
  });

  it('writes names as first name and family name', () => {
    expect(driverName('VAN DER LINDE Kelvin')).toBe('Kelvin van der Linde');
    expect(driverName('AUER Lucas')).toBe('Lucas Auer');
  });
});
