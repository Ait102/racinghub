import { loadCircuitLayouts, type CircuitLayout } from '../../../data/circuits';
import type { Named } from '../../../lib/wikiStandings';

interface FeCircuitLayout {
  venues: string[];
  description: string;
  confirmations: Record<string, string>;
  load: () => Promise<CircuitLayout | null>;
}

const LAYOUTS: FeCircuitLayout[] = [
  {
    venues: ['Tempelhof Airport Street Circuit'],
    description:
      'Трасса проходит по бетонному перрону бывшего аэропорта Темпельхоф. Широкие участки сменяются тесными шпильками.',
    confirmations: {
      '2025-26':
        'https://www.fiaformulae.com/en/news/races/track-map-what-does-the-berlin-e-prix-circuit-look-like',
    },
    load: async () => (await import('./circuit-shapes')).berlin,
  },
  {
    venues: ['Circuito del Jarama', 'Circuito Permanente del Jarama', 'Circuito de Madrid Jarama-RACE'],
    description: 'Постоянный автодром под Мадридом, спроектированный Джоном Хугенхольцем.',
    confirmations: {
      '2025-26': 'https://www.fiaformulae.com/en/news/races/preview-madrid-makes-debut-round-6-in-spain',
    },
    load: async () => (await import('./circuit-shapes')).jarama,
  },
  {
    venues: ['Circuit de Monaco'],
    description: 'Городская трасса проходит через Монте-Карло, туннель и набережную у порта.',
    confirmations: {
      '2021-22':
        'https://www.fiaformulae.com/en/news/races/formula-e-fia-and-acm-reveal-monaco-e-prix-circuit-layout',
      '2022-23': 'https://www.fiaformulae.com/en/news/419576',
      '2023-24':
        'https://www.fiaformulae.com/en/news/races/track-map-what-does-the-monaco-e-prix-circuit-look-like',
      '2024-25':
        'https://www.fiaformulae.com/en/news/races/track-map-what-does-the-monaco-e-prix-circuit-look-like',
      '2025-26':
        'https://www.fiaformulae.com/en/news/races/track-map-what-does-the-monaco-e-prix-circuit-look-like',
      '2026-27':
        'https://www.fiaformulae.com/en/news/races/formula-e-updates-202627-calendar-and-secures-long-term-future-in-monaco',
    },
    async load() {
      // Formula E adopted the traditional Nouvelle Chicane in 2022.
      const layout = (await loadCircuitLayouts('monaco')).find(
        ({ lengthKm, turns }) => lengthKm === 3.337 && turns === 19,
      );
      return layout ? { ...layout, eras: [[2022, 2027]] } : null;
    },
  },
  {
    venues: ['São Paulo Street Circuit', 'Anhembi Sambadrome Circuit'],
    description:
      'Уличная трасса проходит вокруг самбодрома Анхемби. Длинные прямые соединяют тесные повороты.',
    confirmations: {
      '2022-23':
        'https://www.fiaformulae.com/en/news/17846/what-to-expect-deom-formula-e-s-newest-race-track-in-sao-paulo',
      '2025-26':
        'https://www.fiaformulae.com/en/news/races/track-map-what-does-the-sao-paulo-e-prix-circuit-look-like',
    },
    load: async () => (await import('./circuit-shapes')).saoPaulo,
  },
  {
    venues: ['Shanghai International Circuit'],
    description: 'Formula E использует укороченную конфигурацию Шанхайского международного автодрома.',
    confirmations: {
      '2023-24':
        'https://www.fiaformulae.com/en/news/races/circuit-layout-unveild-for-formula-es-first-trip-to-shanghai-china',
      '2024-25':
        'https://www.fiaformulae.com/en/news/750961/city-guide-the-sights-the-food-and-the-history-of-shanghai',
      '2025-26': 'https://www.fiaformulae.com/en/news/races/preview-shanghai-s12',
    },
    load: async () => (await import('./circuit-shapes')).shanghai,
  },
];

export function findFeCircuitLayout(venue: Named | null, season: string): FeCircuitLayout | null {
  const name = (venue?.article ?? venue?.name)?.replace(/_/g, ' ').trim().toLowerCase();
  return (
    LAYOUTS.find(
      (layout) =>
        Object.hasOwn(layout.confirmations, season) && layout.venues.some((v) => v.toLowerCase() === name),
    ) ?? null
  );
}
