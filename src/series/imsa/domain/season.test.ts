import { describe, expect, it } from 'vitest';

import daytona from '../__fixtures__/race-2026-24-hours-of-daytona.html?raw';
import longBeach from '../__fixtures__/race-2026-grand-prix-of-long-beach.html?raw';
import y2014 from '../__fixtures__/season-2014.html?raw';
import y2019 from '../__fixtures__/season-2019.html?raw';
import y2026 from '../__fixtures__/season-2026.html?raw';
import { parseImsaRace } from './race';
import {
  classCode,
  imsaRaceStatus,
  nextImsaRace,
  parseImsaDates,
  parseImsaSeason,
  seasonClasses,
} from './season';

const s2014 = parseImsaSeason('2014', '2014 United SportsCar Championship', y2014);
const s2019 = parseImsaSeason('2019', '2019 IMSA SportsCar Championship', y2019);
const s2026 = parseImsaSeason('2026', '2026 IMSA SportsCar Championship', y2026);

describe('parseImsaSeason', () => {
  it('reads the schedule with dates, length, classes and race articles', () => {
    expect(s2026.races).toHaveLength(11);
    expect(s2026.races[0]).toMatchObject({
      round: 1,
      name: 'Rolex 24 at Daytona',
      length: '24 hours',
      classes: 'All',
      circuit: { name: 'Daytona International Speedway' },
      start: '2026-01-24',
      end: '2026-01-25',
      report: '2026 24 Hours of Daytona',
    });
    expect(s2026.races[2].classes).toBe('GTP, GTD');
  });

  it('reads class winners with their crews', () => {
    expect(s2026.races[0].winners.map((w) => w.cls)).toEqual(['GTP', 'LMP2', 'GTD Pro', 'GTD']);
    expect(s2026.races[0].winners[0]).toMatchObject({
      team: { name: '#7 Porsche Penske Motorsport' },
      drivers: [{ name: 'Julien Andlauer' }, { name: 'Laurin Heinrich' }, { name: 'Felipe Nasr' }],
    });
  });

  it('takes the classes of each era from the tables', () => {
    expect(seasonClasses(s2026)).toEqual(['GTP', 'LMP2', 'GTD Pro', 'GTD']);
    expect(seasonClasses(s2019)).toEqual(['DPi', 'LMP2', 'GTLM', 'GTD']);
    expect(seasonClasses(s2014)).toEqual(['P', 'PC', 'GTLM', 'GTD']);
  });

  it('reads the standings of every class, by kind', () => {
    expect(s2026.standings.map((t) => t.id)).toEqual([
      'gtp-drivers',
      'lmp2-drivers',
      'gtd-pro-drivers',
      'gtd-drivers',
      'gtp-teams',
      'lmp2-teams',
      'gtd-pro-teams',
      'gtd-teams',
      'gtp-manufacturers',
      'gtd-pro-manufacturers',
      'gtd-manufacturers',
    ]);
    const lmp2 = s2026.standings.find((t) => t.id === 'lmp2-drivers')!;
    // A crew sharing one position keeps both names.
    expect(lmp2.rows[0]).toMatchObject({ name: { name: 'George Kurtz / Alex Quinn' }, points: '2322' });
    expect(s2026.standings.find((t) => t.id === 'gtp-teams')?.rows[0]).toMatchObject({
      name: { name: '#31 Cadillac Whelen' },
      extra: 'Cadillac V-Series.R',
    });
  });

  it('reads older layouts: <td> round headers (2019) and "Total Points" (2014)', () => {
    expect(s2019.standings.find((t) => t.id === 'dpi-drivers')?.rounds).toHaveLength(10);
    expect(s2014.standings.find((t) => t.id === 'p-teams')?.rows[0]).toMatchObject({ points: '349' });
    expect(s2014.standings.map((t) => t.title)).toContain('Engine manufacturers · P');
  });
});

describe('parseImsaRace', () => {
  it('reads the classification with class positions, crews, chassis and engine', () => {
    const race = parseImsaRace('2026 24 Hours of Daytona', daytona);
    expect(race.rows).toHaveLength(60);
    expect(race.rows[0]).toMatchObject({
      pos: 1,
      status: null,
      cls: 'GTP',
      pic: '1',
      number: '7',
      team: { name: 'Porsche Penske Motorsport' },
      chassis: 'Porsche 963',
      engine: 'Porsche 9RD 4.6 L Turbo V8',
      laps: '705',
    });
    expect(race.rows.at(-1)).toMatchObject({ pos: 60, status: 'DNF', cls: 'GTD' });
  });

  it('reads a race without a class-position column', () => {
    const race = parseImsaRace('2026 Grand Prix of Long Beach', longBeach);
    expect(race.rows).toHaveLength(28);
    expect(race.rows[0]).toMatchObject({
      pic: null,
      number: '93',
      drivers: [{ name: 'Renger van der Zande' }, {}],
    });
  });
});

describe('helpers', () => {
  it('maps class names to codes', () => {
    expect(classCode('Standings: Grand Touring Prototype (GTP)')).toBe('GTP');
    expect(classCode('Standings: Daytona Prototype international')).toBe('DPi');
    expect(classCode('Prototype Challenge')).toBe('PC');
    expect(classCode('Drivers')).toBeNull();
  });

  it('reads date ranges and statuses', () => {
    expect(parseImsaDates('January 24–25', '2026')).toEqual({ start: '2026-01-24', end: '2026-01-25' });
    expect(parseImsaDates('September 30 – October 1', '2026')).toEqual({
      start: '2026-09-30',
      end: '2026-10-01',
    });
    const race = { ...s2026.races[0], winners: [] };
    expect(imsaRaceStatus(race, new Date(2026, 0, 20))).toBe('upcoming');
    expect(imsaRaceStatus(race, new Date(2026, 0, 25))).toBe('live');
    expect(imsaRaceStatus(race, new Date(2026, 0, 27))).toBe('awaiting');
    expect(nextImsaRace(s2026.races, new Date(2026, 10, 18))).toBeNull();
  });
});
