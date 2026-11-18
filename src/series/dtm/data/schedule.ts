import type { WeekendScheduleData } from '../../../lib/raceSchedule';
import type { DtmRace } from '../domain/season';
import { scheduleByRound } from './schedule.generated';

/** Official timetable of a DTM event (scripts/fetch-schedules.mjs dtm); null when not published. */
export function dtmWeekendSchedule(season: string, round: number): WeekendScheduleData | null {
  return scheduleByRound[season]?.[String(round)] ?? null;
}

/** Start of one race of the event: the timetable lists race 1 and race 2 in order. */
export function dtmRaceStart(season: string, race: DtmRace): string | null {
  const races = dtmWeekendSchedule(season, race.round)?.sessions.filter((s) => s.kind === 'race') ?? [];
  return races[(race.race ?? 1) - 1]?.start ?? null;
}
