import type { ChampionshipProgress } from '../../../lib/championshipProgress';
import type { StandingKind, StandingTable } from '../domain/types';
import { standingProgress2025 } from './standingProgress2025.generated';
import { standingProgress2026 } from './standingProgress2026.generated';

type Classification = `${'hypercar' | 'lmgt3'}-${StandingKind}`;
type PublishedSeries = [
  id: string,
  label: string,
  shortLabel: string,
  car: string | null,
  points: (number | null)[],
];
export type PublishedStandingPoints = Partial<Record<Classification, PublishedSeries[]>>;

// Round order of the FIA WEC season page; names as the calendar gives them.
const rounds2025 = [
  ['QAT', 'Qatar 1812 km'],
  ['IMO', '6 Hours of Imola'],
  ['SPA', '6 Hours of Spa-Francorchamps'],
  ['LMS', '24 Hours of Le Mans'],
  ['SÃO', '6 Hours of São Paulo'],
  ['COA', 'Lone Star Le Mans'],
  ['FUJ', '6 Hours of Fuji'],
  ['BHR', '8 Hours of Bahrain'],
];

const rounds2026 = [
  ['IMO', '6 Hours of Imola'],
  ['SPA', '6 Hours of Spa-Francorchamps'],
  ['LMS', '24 Hours of Le Mans'],
  ['SÃO', '6 Hours of São Paulo'],
  ['COA', 'Lone Star Le Mans'],
  ['FUJ', '6 Hours of Fuji'],
  ['CAT', '6 Hours of Barcelona'],
  ['MNZ', '6 Hours of Monza'],
];

const PUBLISHED: Record<string, [PublishedStandingPoints, string[][]]> = {
  '2025': [standingProgress2025, rounds2025],
  '2026': [standingProgress2026, rounds2026],
};

export function wecStandingProgress(season: string, table: StandingTable): ChampionshipProgress | null {
  const published = PUBLISHED[season];
  if (!published) return null;
  const [points, rounds] = published;
  const cls = /\bhypercar\b/i.test(table.title)
    ? 'hypercar'
    : /\blmgt3\b/i.test(table.title)
      ? 'lmgt3'
      : null;
  const standings = cls && points[`${cls}-${table.kind}`];
  if (!standings) return null;

  return {
    rounds: rounds.map(([label, title]) => ({ label, title })),
    series: standings.map(([id, label, shortLabel, car, points]) => ({
      id,
      label,
      shortLabel,
      ...(car ? { group: car } : {}),
      points,
    })),
    sources: [
      { label: 'FIA WEC · классификации по этапам', url: `https://www.fiawec.com/en/season/${season}` },
    ],
  };
}
