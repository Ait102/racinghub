import type { ChampionshipProgress } from '../../../lib/championshipProgress';
import type { StandingKind, StandingTable } from '../../../lib/wikiStandings';
import { fePublishedPoints } from './standingProgress.generated';

type Entry = [name: string, shortName: string, points: (number | null)[]];

/** One season of published totals: "R01" + venue per round, then every championship by kind. */
export type FePublishedPoints = { rounds: [label: string, venue: string][] } & Partial<
  Record<StandingKind, Entry[]>
>;

/** Points after each round, as the FIA Formula E classifications publish them (scripts/fetch-fe-points.mjs). */
export function feStandingProgress(season: string, table: StandingTable): ChampionshipProgress | null {
  const data = fePublishedPoints[season];
  const entries = data?.[table.kind];
  if (!data || !entries?.length) return null;

  return {
    rounds: data.rounds.map(([label, venue], index) => ({
      label: String(Number(label.slice(1)) || index + 1),
      title: `Этап ${index + 1} · ${venue}`,
    })),
    series: entries.map(([label, shortLabel, points]) => ({ id: shortLabel, label, shortLabel, points })),
    sources: [
      {
        label: 'FIA Formula E · классификации по этапам',
        url: 'https://results.formulae.fia.com/results',
      },
    ],
  };
}
