import type { ChampionshipProgress } from '../../../lib/championshipProgress';
import type { StandingTable } from '../../../lib/wikiStandings';
import { standingProgress2025 } from './standingProgress2025-26';

const ROUNDS_2025 = [
  'São Paulo',
  'Mexico City',
  'Miami',
  'Jeddah',
  'Jeddah',
  'Madrid',
  'Berlin',
  'Berlin',
  'Monaco',
  'Monaco',
  'Sanya',
  'Shanghai',
  'Shanghai',
  'Tokyo',
  'Tokyo',
  'London',
  'London',
];

export function feStandingProgress(season: string, table: StandingTable): ChampionshipProgress | null {
  if (season !== '2025-26') return null;

  return {
    rounds: ROUNDS_2025.map((name, index) => ({
      label: String(index + 1),
      title: `Этап ${index + 1} · ${name}`,
    })),
    series: standingProgress2025[table.kind].map(([label, shortLabel, points]) => ({
      id: shortLabel,
      label,
      shortLabel,
      points,
    })),
    sources: [
      {
        label: 'FIA Formula E · классификации по этапам',
        url: 'https://results.formulae.fia.com/notice-board',
      },
    ],
  };
}
