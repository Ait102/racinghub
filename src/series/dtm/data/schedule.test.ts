// @vitest-environment node
import type { DtmRace } from '../domain/season';
import { dtmRaceStart, dtmWeekendSchedule } from './schedule';

const race = (round: number, n: number | null) => ({ round, race: n }) as DtmRace;

it('gives each race of the event its own start from the official timetable', () => {
  expect(dtmRaceStart('2026', race(1, 1))).toBe('2026-04-25T11:30:00+00:00');
  expect(dtmRaceStart('2026', race(1, 2))).toBe('2026-04-26T11:30:00+00:00');
  expect(dtmWeekendSchedule('2026', 1)?.source).toBe('https://www.dtm.com/en/events/red-bull-ring-2026');
  expect(dtmWeekendSchedule('2000', 1)).toBeNull();
});
