import type { ChampionshipProgress } from '../../../lib/championshipProgress';
import type { StandingKind, StandingTable } from '../../../lib/wikiStandings';
import { dtmPublishedPoints } from './standingProgress.generated';

/** A season of official race points, summed per entrant (scripts/fetch-dtm-points.mjs). */
export type DtmPublishedPoints = { rounds: string[] } & Partial<
  Record<StandingKind, [name: string, points: (number | null)[]][]>
>;

/**
 * Points after each race. DTM publishes points per race and the season total; every line here is
 * the sum of the published race points and was checked to end at the published total.
 */
export function dtmStandingProgress(season: string, table: StandingTable): ChampionshipProgress | null {
  const data = dtmPublishedPoints[season];
  // Only the main championships: the rookie classification has no per-race totals.
  if (!data || (table.rounds.length === 0 && table.kind === 'drivers')) return null;
  const entries = data[table.kind];
  if (!entries?.length) return null;
  return {
    rounds: data.rounds.map((name, i) => ({ label: String(i + 1), title: `Гонка ${i + 1} · ${name}` })),
    series: entries.map(([name, points]) => ({ id: name, label: name, shortLabel: name, points })),
    sources: [
      {
        label: 'DTM · официальные очки за каждую гонку (dtm.com), сложены и сверены с итогом сезона',
        url: 'https://www.dtm.com/en/standings',
      },
    ],
  };
}
