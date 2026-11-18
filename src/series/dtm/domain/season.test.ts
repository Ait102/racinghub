import { describe, expect, it } from 'vitest';

import y2000 from '../__fixtures__/season-2000.html?raw';
import y2021 from '../__fixtures__/season-2021.html?raw';
import y2026 from '../__fixtures__/season-2026.html?raw';
import {
  daysUntilDtm,
  dtmRaceStatus,
  nextDtmRace,
  parseDtmDate,
  parseDtmSeason,
  raceColumn,
  raceResults,
} from './season';

const s2000 = parseDtmSeason('2000', '2000 Deutsche Tourenwagen Masters', y2000);
const s2021 = parseDtmSeason('2021', '2021 Deutsche Tourenwagen Masters', y2021);
const s2026 = parseDtmSeason('2026', '2026 Deutsche Tourenwagen Masters', y2026);

describe('parseDtmSeason', () => {
  it('reads two races per event with dates from the modern calendar', () => {
    expect(s2026.races).toHaveLength(16);
    expect(s2026.races.slice(0, 2)).toMatchObject([
      { index: 1, round: 1, race: 1, date: '2026-04-25', winner: { name: 'Thomas Preining' } },
      { index: 2, round: 1, race: 2, date: '2026-04-26', winner: { name: 'Maro Engel' } },
    ]);
    expect(s2026.races[0].circuit?.name).toBe('Red Bull Ring');
    expect(s2026.races[0].pole?.name).toBe('Maro Engel');
    expect(s2021.races[0]).toMatchObject({ date: '2021-06-19', winner: { name: 'Liam Lawson' } });
  });

  it('keeps a cancelled event as a note, not as a winner', () => {
    const cancelled = s2000.races.find((r) => r.note);
    expect(cancelled).toMatchObject({ round: 6, race: null, winner: null });
    expect(cancelled?.note).toMatch(/cancelled/i);
    expect(s2000.races.at(-1)).toMatchObject({ round: 9, race: 2, winner: { name: 'Uwe Alzen' } });
  });

  it('reads standings with race columns and the totals-only tables', () => {
    expect(s2026.standings.map((t) => [t.kind, t.rounds.length])).toEqual([
      ['drivers', 16],
      ['drivers', 0],
      ['teams', 0],
      ['manufacturers', 0],
    ]);
    expect(s2026.standings[0].rows[0]).toMatchObject({ name: { name: 'Thomas Preining' }, points: '225' });
    // The "Guest drivers ineligible to score points" separator is not a driver.
    expect(s2026.standings[0].rows.some((r) => /Guest/.test(r.name.name))).toBe(false);
    expect(s2021.standings.find((t) => t.kind === 'manufacturers')?.rows[0].name.name).toBe('Mercedes-AMG');
  });

  it('keeps qualifying points apart from the place', () => {
    const cell = s2026.standings[0].rows[0].lines[0][0];
    expect(cell).toMatchObject({ place: 1, main: '1', sup: '3', tone: 'gold' });
  });
});

describe('race results', () => {
  it('maps races to standings columns by event, also when an event was cancelled', () => {
    // 2000: 17 races in the table, 18 columns (the cancelled event has two).
    const drivers = s2000.standings[0];
    expect(drivers.rounds).toHaveLength(18);
    const last = s2000.races.at(-1)!;
    expect(raceColumn(s2000, drivers, last)).toBe(17);
    expect(raceResults(s2000, last)?.[0]).toMatchObject({
      driver: { name: 'Uwe Alzen' },
      cell: { place: 1 },
    });
    expect(
      raceResults(
        s2000,
        s2000.races.find((r) => r.note)!,
      ),
    ).toBeNull();
  });

  it('orders a race by the published places', () => {
    const results = raceResults(s2026, s2026.races[0])!;
    expect(results.slice(0, 2).map((r) => [r.driver.name, r.cell.place])).toEqual([
      ['Thomas Preining', 1],
      ['Lucas Auer', 2],
    ]);
  });
});

describe('status', () => {
  it('reads dates and statuses', () => {
    expect(parseDtmDate('3 September', '2000')).toBe('2000-09-03');
    expect(parseDtmDate('TBA', '2000')).toBeNull();
    const race = { ...s2026.races[0], winner: null };
    expect(dtmRaceStatus(race, new Date(2026, 3, 20))).toBe('upcoming');
    expect(dtmRaceStatus(race, new Date(2026, 3, 25))).toBe('live');
    expect(dtmRaceStatus(race, new Date(2026, 3, 27))).toBe('awaiting');
    expect(dtmRaceStatus(s2026.races[0], new Date(2026, 3, 20))).toBe('completed');
    expect(daysUntilDtm(race, new Date(2026, 3, 20))).toBe(5);
    expect(nextDtmRace(s2026.races, new Date(2026, 10, 18))).toBeNull();
  });
});
