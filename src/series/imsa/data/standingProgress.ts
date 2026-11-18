import type { ChampionshipProgress } from '../../../lib/championshipProgress';
import type { ImsaStanding } from '../domain/season';
import { imsaPublishedPoints } from './standingProgress.generated';

/** One championship of a season: rounds the class ran (season round, venue) and totals after each. */
export interface ImsaPublishedPoints {
  [classAndKind: string]: {
    rounds: [round: number, venue: string][];
    series: [name: string, points: (number | null)[]][];
  };
}

/**
 * Points after each round as IMSA publishes them (scripts/fetch-imsa-points.mjs). A round whose official
 * totals were not published (only provisional ones) stays empty.
 */
export function imsaStandingProgress(season: string, table: ImsaStanding): ChampionshipProgress | null {
  const data = imsaPublishedPoints[season]?.[`${table.cls}-${table.kind}`];
  if (!data?.series.length) return null;
  return {
    rounds: data.rounds.map(([round, venue]) => ({
      label: String(round),
      title: `Этап ${round} · ${venue}`,
    })),
    series: data.series.map(([name, points]) => ({ id: name, label: name, shortLabel: name, points })),
    sources: [
      {
        label: 'IMSA · официальные очки по этапам (Al Kamel Systems)',
        url: `https://imsa.results.alkamelcloud.com/?season=${season.slice(2)}_${season}`,
      },
    ],
  };
}
