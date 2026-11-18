import type { WeekendScheduleData } from '../../../lib/raceSchedule';
import { scheduleByRound } from './schedule.generated';

/**
 * Sessions of a round as IMSA's official results record them (scripts/fetch-schedules.mjs imsa):
 * known once they have run; null when the source has none yet.
 */
export function imsaWeekendSchedule(season: string, round: number): WeekendScheduleData | null {
  return scheduleByRound[season]?.[String(round)] ?? null;
}

/** Start of the race (date-time with offset), when known. */
export const imsaRaceStart = (season: string, round: number): string | null =>
  imsaWeekendSchedule(season, round)?.sessions.find((s) => s.kind === 'race')?.start ?? null;
