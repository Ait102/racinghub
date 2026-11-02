import { loadCircuitLayouts, type CircuitLayout } from '../../../data/circuits';
import { seasonEndYear } from './seasons';

export interface WecCircuit {
  slug: string;
  article: string;
  aliases: string[];
  description: string;
  /** Extra source when the WEC configuration cannot be selected by F1 race years. */
  configurationSource?: string;
  /** An explicitly verified common outline, not a fallback to the newest layout. */
  configuration?: { lengthKm: number; turns: number; from: number };
}

// Short, factual summaries of the linked articles, checked 2026-11-02.
// Geometry attribution is separate and appears beneath each map.
const CIRCUITS: WecCircuit[] = [
  {
    slug: 'sarthe',
    article: 'Circuit de la Sarthe',
    aliases: ['Circuit des 24 Heures du Mans', '24 Hours of Le Mans'],
    description:
      'Трасса Ле-Мана сочетает постоянные гоночные участки и дороги общего пользования. Здесь проходят «24 часа Ле-Мана».',
    configurationSource: 'https://www.fiawec.com/en/race/24-hours-of-le-mans-2026',
  },
  {
    slug: 'fuji',
    article: 'Fuji Speedway',
    aliases: ['6 Hours of Fuji'],
    description:
      'Автодром в Ояме, у восточного подножия горы Фудзи. Трасса открылась в 1966 году; современная конфигурация появилась после реконструкции 2005 года.',
    configuration: { lengthKm: 4.563, turns: 16, from: 2005 },
    configurationSource: 'https://www.fiawec.com/en/race/6-hours-of-fuji-2025',
  },
  {
    slug: 'spa-francorchamps',
    article: 'Circuit de Spa-Francorchamps',
    aliases: ['Spa-Francorchamps', '6 Hours of Spa-Francorchamps', '1000 km of Spa'],
    description:
      'Бельгийская трасса в Арденнах с перепадами высот. Её наиболее известный участок — подъём через связку Eau Rouge и Raidillon.',
  },
  {
    slug: 'bahrain',
    article: 'Bahrain International Circuit',
    aliases: ['6 Hours of Bahrain', '8 Hours of Bahrain'],
    description:
      'Автодром в Сахире, открытый в 2004 году. В WEC используется конфигурация Grand Prix, а не длинная Endurance или короткая Outer.',
    configuration: { lengthKm: 5.412, turns: 15, from: 2005 },
    configurationSource: 'https://www.24h-lemans.com/en/news/fia-wec-a-guide-to-the-bahrain-circuit-55733',
  },
  {
    slug: 'interlagos',
    article: 'Interlagos Circuit',
    aliases: ['Autódromo José Carlos Pace', 'Autódromo de Interlagos', '6 Hours of São Paulo'],
    description:
      'Автодром в Сан-Паулу, также известный как Интерлагос и названный в честь Жозе Карлуса Паче. Движение проходит против часовой стрелки.',
  },
  {
    slug: 'austin',
    article: 'Circuit of the Americas',
    aliases: ['Lone Star Le Mans', '6 Hours of Circuit of the Americas', '6 Hours of Austin'],
    description:
      'Гоночный комплекс близ Остина, штат Техас, открытый в 2012 году. Трассу отличает подъём к первому повороту.',
  },
  {
    slug: 'lusail',
    article: 'Lusail International Circuit',
    aliases: ['Losail International Circuit', 'Qatar 1812 km', 'Qatar 1812km'],
    description:
      'Автодром в Лусаиле, Катар. Постоянная трасса открылась в 2004 году и оборудована освещением для вечерних гонок.',
  },
  {
    slug: 'imola',
    article: 'Imola Circuit',
    aliases: [
      'Autodromo Enzo e Dino Ferrari',
      'Autodromo Internazionale Enzo e Dino Ferrari',
      '6 Hours of Imola',
    ],
    description: 'Трасса имени Энцо и Дино Феррари в Имоле, Италия. Она проходит против часовой стрелки.',
    configuration: { lengthKm: 4.909, turns: 19, from: 2008 },
    configurationSource:
      'https://api.fia.com/news/imola-primed-epic-fia-world-endurance-championship-season-opener',
  },
  {
    slug: 'monza',
    article: 'Monza Circuit',
    aliases: ['Autodromo Nazionale di Monza', 'Autodromo Nazionale Monza', '6 Hours of Monza'],
    description:
      'Автодром в парке Монцы, открытый в 1922 году. Длинные прямые соединены шиканами и быстрыми поворотами.',
  },
  {
    slug: 'portimao',
    article: 'Algarve International Circuit',
    aliases: [
      'Autódromo Internacional do Algarve',
      'Portimão Circuit',
      '6 Hours of Portimão',
      '8 Hours of Portimão',
    ],
    description:
      'Автодром близ Портимана в португальском регионе Алгарве. Открыт в 2008 году; трасса проходит по холмистой местности.',
  },
  {
    slug: 'sebring',
    article: 'Sebring International Raceway',
    aliases: ['1000 Miles of Sebring', '12 Hours of Sebring'],
    description:
      'Трасса во Флориде на территории бывшего военного аэродрома. Первые «12 часов Себринга» состоялись в 1952 году.',
    configurationSource: 'https://www.sebringraceway.com/track-history/',
  },
  {
    slug: 'silverstone',
    article: 'Silverstone Circuit',
    aliases: ['6 Hours of Silverstone', '4 Hours of Silverstone'],
    description:
      'Британский автодром на месте бывшей авиабазы RAF Silverstone. В эпоху WEC используется конфигурация с секцией Arena, появившаяся в 2010 году.',
  },
  {
    slug: 'shanghai',
    article: 'Shanghai International Circuit',
    aliases: ['6 Hours of Shanghai', '4 Hours of Shanghai'],
    description: 'Автодром в районе Цзядин в Шанхае, Китай. Построен к первому Гран-при Китая 2004 года.',
  },
  {
    slug: 'mexico-city',
    article: 'Autódromo Hermanos Rodríguez',
    aliases: ['6 Hours of Mexico'],
    description:
      'Автодром в Мехико, названный в честь Рикардо и Педро Родригесов. Современная конфигурация проходит через бывший бейсбольный стадион Foro Sol.',
  },
  {
    slug: 'nurburgring-wec',
    article: 'Nürburgring',
    aliases: ['6 Hours of Nürburgring'],
    description:
      'Гоночный комплекс в немецком регионе Айфель. WEC использовал короткую трассу Grand Prix, а не Северную петлю; её вариант шиканы отличается от F1.',
  },
  {
    slug: 'catalunya',
    article: 'Circuit de Barcelona-Catalunya',
    aliases: ['Circuit de Catalunya', '6 Hours of Barcelona'],
    description:
      'Постоянный автодром в Монмело близ Барселоны, открытый в 1991 году. Конфигурация последних поворотов менялась по годам.',
  },
];

function articleKey(article: string): string {
  return article
    .replace(/_/g, ' ')
    .replace(/^\d{4}\s+/, '')
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

const ARTICLES = new Map(
  CIRCUITS.flatMap((circuit) =>
    [circuit.article, ...circuit.aliases].map((article) => [articleKey(article), circuit] as const),
  ),
);

export function findWecCircuit(article: string | null | undefined): WecCircuit | null {
  return article ? (ARTICLES.get(articleKey(article)) ?? null) : null;
}

/** WEC years are independent of the years in which F1 visited the same venue. */
export async function loadWecCircuit(
  article: string | null | undefined,
  season: string,
  raceYear?: number,
): Promise<CircuitLayout | null> {
  const circuit = findWecCircuit(article);
  const year = raceYear ?? seasonEndYear(season);
  if (!circuit || !Number.isInteger(year) || year < 2012 || year > 2026) return null;
  if (circuit.slug === 'sarthe' || circuit.slug === 'sebring') {
    const { WEC_LAYOUTS } = await import('./circuit-shapes.generated');
    const layout = WEC_LAYOUTS[circuit.slug];
    return layout.eras.some(([from, to]) => year >= from && year <= to) ? layout : null;
  }
  // The F1 collection has the 5.148 km chicane, not WEC's 5.137 km Nürburgring route.
  if (circuit.slug === 'nurburgring-wec') return null;
  const layouts = await loadCircuitLayouts(circuit.slug);
  const verified = circuit.configuration;
  const hits = layouts.filter((layout) =>
    verified
      ? layout.lengthKm === verified.lengthKm && layout.turns === verified.turns && year >= verified.from
      : layout.eras.some(([from, to]) => year >= from && year <= to),
  );
  if (hits.length !== 1) return null;
  return verified ? { ...hits[0], eras: [[verified.from, 2026]] } : hits[0];
}
