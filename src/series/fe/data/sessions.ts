// Free practice classifications of Formula E (scripts/fetch-fe-sessions.mjs), loaded on demand.
import type { SessionData } from '../../../components/SessionResults';

type Row = [
  pos: string,
  number: string,
  driver: string,
  team: string,
  bestLap: string,
  gap: string,
  laps: string,
];
export type FeSessionsByRound = Record<string, Array<{ label: string; rows: Row[] }>>;

const seasons = import.meta.glob<{ SESSIONS: FeSessionsByRound }>('./sessions/*.ts');

export async function loadFePractice(season: string, round: number): Promise<SessionData[]> {
  const load = seasons[`./sessions/${season}.ts`];
  if (!load) return [];
  const { SESSIONS } = await load();
  return (SESSIONS[String(round)] ?? []).map((s, i) => ({
    key: String(i),
    label: s.label,
    start: null,
    rows: s.rows.map(([pos, number, driver, team, bestLap, gap, laps]) => ({
      pos: Number(pos) || null,
      posText: pos,
      number,
      drivers: [driver],
      team,
      car: '',
      time: '',
      gap,
      laps,
      bestLap,
    })),
  }));
}
