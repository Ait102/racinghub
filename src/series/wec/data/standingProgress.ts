import type { ChampionshipProgress } from '../../../lib/championshipProgress';
import type { StandingKind, StandingTable } from '../domain/types';
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

export function wecStandingProgress(season: string, table: StandingTable): ChampionshipProgress | null {
  if (season !== '2026') return null;
  const cls = /\bhypercar\b/i.test(table.title)
    ? 'hypercar'
    : /\blmgt3\b/i.test(table.title)
      ? 'lmgt3'
      : null;
  const standings = cls && standingProgress2026[`${cls}-${table.kind}`];
  if (!standings) return null;

  return {
    rounds: rounds2026.map(([label, title]) => ({ label, title })),
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
