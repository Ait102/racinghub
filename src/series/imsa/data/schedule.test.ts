// @vitest-environment node
import { imsaRaceStart, imsaWeekendSchedule } from './schedule';

it('keeps the local start of each session with the circuit time zone', () => {
  // Rolex 24 2026: green flag at 13:40 Eastern (standard time in January).
  expect(imsaRaceStart('2026', 1)).toBe('2026-01-24T13:40:00-05:00');
  // Long Beach in April: Pacific daylight time.
  expect(imsaRaceStart('2026', 3)).toMatch(/-07:00$/);
  expect(imsaWeekendSchedule('2026', 1)?.sessions.map((s) => s.label)).toEqual([
    'Свободная практика 1',
    'Квалификация',
    'Свободная практика 2',
    'Свободная практика 3',
    'Гонка',
  ]);
  expect(imsaWeekendSchedule('2019', 1)).toBeNull();
});
