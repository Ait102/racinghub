// Official classifications of every IMSA session, generated per season by
// scripts/fetch-schedules.mjs imsa and loaded only when a race page needs them.
import type { SessionData } from '../../../components/SessionResults';
import { imsaWeekendSchedule } from './schedule';

type Row = [
  pos: string,
  status: string,
  number: string,
  cls: string,
  drivers: string[],
  team: string,
  car: string,
  total: string,
  gap: string,
  laps: string,
  bestLap: string,
];
export type ImsaSessionsByRound = Record<string, Array<{ label: string; file: string; rows: Row[] }>>;

const seasons = import.meta.glob<{ SESSIONS: ImsaSessionsByRound }>('./sessions/*.ts');

/** Sessions of a round with their results, or [] when the season has none generated. */
export async function loadImsaSessions(season: string, round: number): Promise<SessionData[]> {
  const load = seasons[`./sessions/${season}.ts`];
  if (!load) return [];
  const { SESSIONS } = await load();
  const starts = imsaWeekendSchedule(season, round)?.sessions ?? [];
  return (SESSIONS[String(round)] ?? []).map((s, i) => ({
    key: String(i),
    label: s.label,
    start: starts.find((x) => x.label === s.label)?.start ?? null,
    rows: s.rows.map(([pos, status, number, cls, drivers, team, car, total, gap, laps, bestLap]) => ({
      pos: Number(pos) || null,
      posText: status ? `${pos} ${status}`.trim() : pos,
      number,
      cls,
      drivers,
      team,
      car,
      time: total,
      gap,
      laps,
      bestLap,
    })),
  }));
}
