// Manufacturer emblems for WEC and Formula E. They are registered trademarks of their owners and are
// shown only to identify the manufacturer, next to its name, on a non-commercial fan site.
// Files live in public/logos/ (some are shared with F1): only the emblem, cropped and
// shown in a circle of the manufacturer color. Every file needs a row here with its source and licence.
import type { EmblemEntry } from '../components/Emblem';

export interface MakeEmblem extends EmblemEntry {
  /** Circle color (decorative, not data). */
  color: string;
}

const PD = 'Public domain (PD-textlogo), товарный знак';
const FAIR = 'Несвободный (fair use в Википедии)';

/** Keyed by the manufacturer's name as the source writes it, lower case. */
const EMBLEMS: Readonly<Record<string, MakeEmblem>> = {
  toyota: {
    file: 'toyota.png',
    source: 'https://commons.wikimedia.org/wiki/File:Toyota_carlogo.svg',
    license: PD,
    holder: 'Toyota Motor Corporation',
    tone: 'white',
    color: '#eb0a1e',
  },
  porsche: {
    file: 'porsche.png',
    source: 'https://en.wikipedia.org/wiki/File:Porsche_Logo_2024.png',
    license: FAIR,
    holder: 'Dr. Ing. h.c. F. Porsche AG',
    tone: 'color',
    color: '#1d1d1f',
  },
  bmw: {
    file: 'bmw.png',
    source: 'https://commons.wikimedia.org/wiki/File:BMW_logo_(gray).svg',
    license: PD,
    holder: 'BMW AG',
    tone: 'color',
    color: '#1c69d4',
  },
  peugeot: {
    file: 'peugeot.png',
    source: 'https://en.wikipedia.org/wiki/File:Peugeot_2021_Logo.svg',
    license: FAIR,
    holder: 'Stellantis',
    tone: 'color',
    color: '#000000',
  },
  lamborghini: {
    file: 'lamborghini.png',
    source: 'https://en.wikipedia.org/wiki/File:Lamborghini_Logo.svg',
    license: FAIR,
    holder: 'Automobili Lamborghini S.p.A.',
    tone: 'color',
    color: '#1d1d1f',
  },
  genesis: {
    file: 'genesis.png',
    source: 'https://en.wikipedia.org/wiki/File:Genesis_division_emblem.svg',
    license: PD,
    holder: 'Hyundai Motor Company',
    tone: 'white',
    color: '#8a6f4e',
  },
  ford: {
    file: 'ford.png',
    source: 'https://commons.wikimedia.org/wiki/File:Ford_logo_flat.svg',
    license: PD,
    holder: 'Ford Motor Company',
    tone: 'color',
    color: '#3d6fd8',
  },
  corvette: {
    file: 'corvette.png',
    source: 'https://commons.wikimedia.org/wiki/File:Logo_Corvette_-Transparency.png',
    license: 'CC BY-SA 4.0, автор CSC SMN; товарный знак',
    holder: 'General Motors',
    tone: 'color',
    color: '#d9b100',
  },
  lexus: {
    file: 'lexus.png',
    source: 'https://en.wikipedia.org/wiki/File:Lexus_division_emblem.svg',
    license: PD,
    holder: 'Toyota Motor Corporation',
    tone: 'white',
    color: '#3a3d42',
  },
  nissan: {
    file: 'nissan.png',
    source: 'https://commons.wikimedia.org/wiki/File:Nissan_2020_logo.svg',
    license: PD,
    holder: 'Nissan Motor Co., Ltd.',
    tone: 'white',
    color: '#c3002f',
  },
  'isotta fraschini': {
    file: 'isotta.png',
    source: 'https://commons.wikimedia.org/wiki/File:Isotta-Fraschini-Logo.svg',
    license: PD,
    holder: 'Isotta Fraschini Milano',
    tone: 'color',
    color: '#7a1b1b',
  },
  ferrari: {
    file: 'ferrari.svg',
    source: 'https://en.wikipedia.org/wiki/File:Scuderia_Ferrari_HP_logo_24.svg',
    license: FAIR,
    holder: 'Ferrari S.p.A.',
    tone: 'white',
    color: '#dc0000',
  },
  'aston martin': {
    file: 'aston_martin.png',
    source: 'https://en.wikipedia.org/wiki/File:Aston_Martin_Aramco_2024_logo.png',
    license: FAIR,
    holder: 'Aston Martin Lagonda',
    tone: 'white',
    color: '#006f62',
  },
  alpine: {
    file: 'alpine.svg',
    source: 'https://commons.wikimedia.org/wiki/File:Alpine_F1_Team_Logo.svg',
    license: PD,
    holder: 'Alpine Racing',
    tone: 'white',
    color: '#0093cc',
  },
  cadillac: {
    file: 'cadillac.svg',
    source: 'https://en.wikipedia.org/wiki/File:Cadillac_Formula_1_Team_Logo_(2025).svg',
    license: FAIR,
    holder: 'General Motors',
    tone: 'invert',
    color: '#2a2a2a',
  },
  mercedes: {
    file: 'mercedes.svg',
    source: 'https://commons.wikimedia.org/wiki/File:Mercedes-AMG_Petronas_F1_Team_logo_(2026).svg',
    license: PD,
    holder: 'Mercedes-Benz Group AG',
    tone: 'white',
    color: '#00a19c',
  },
  mclaren: {
    file: 'mclaren.svg',
    source: 'https://commons.wikimedia.org/wiki/File:McLaren_Speedmark.svg',
    license: PD,
    holder: 'McLaren Racing Ltd',
    tone: 'white',
    color: '#ff8000',
  },
  audi: {
    file: 'audi.svg',
    source: 'https://commons.wikimedia.org/wiki/File:Audif1.com_logo17_(cropped).svg',
    license: PD,
    holder: 'Audi AG',
    tone: 'white',
    color: '#bb0a30',
  },
  // Formula E makes (powertrains). Cropped to the emblem, 128 px PNG.
  jaguar: {
    file: 'jaguar.png',
    source: 'https://en.wikipedia.org/wiki/File:Jaguar_logo_2021.svg',
    license: FAIR,
    holder: 'Jaguar Land Rover',
    tone: 'white',
    color: '#0f5c3a',
  },
  mahindra: {
    file: 'mahindra.png',
    source: 'https://commons.wikimedia.org/wiki/File:Mahindra_Automotive_new_logo.png',
    license: PD,
    holder: 'Mahindra & Mahindra',
    tone: 'white',
    color: '#c8102e',
  },
  ds: {
    file: 'ds.png',
    source: 'https://en.wikipedia.org/wiki/File:DS_Automobiles_logo.svg',
    license: FAIR,
    holder: 'Stellantis',
    tone: 'color',
    color: '#2a2a2a',
  },
  citroën: {
    file: 'citroen.png',
    source: 'https://commons.wikimedia.org/wiki/File:Citro%C3%ABn_Logo.svg',
    license: PD,
    holder: 'Stellantis',
    tone: 'color',
    color: '#2a2a2a',
  },
  maserati: {
    file: 'maserati.png',
    source: 'https://commons.wikimedia.org/wiki/File:Maserati_logo_2.svg',
    license: PD,
    holder: 'Maserati S.p.A.',
    tone: 'white',
    color: '#0c2340',
  },
  lola: {
    file: 'lola.png',
    source: 'https://commons.wikimedia.org/wiki/File:Lola_Cars_logo.png',
    license: PD,
    holder: 'Lola Cars',
    tone: 'color',
    color: '#2a2a2a',
  },
  nio: {
    file: 'nio.png',
    source: 'https://commons.wikimedia.org/wiki/File:NIO_logo.svg',
    license: PD,
    holder: 'NIO Inc.',
    tone: 'white',
    color: '#1f6f8b',
  },
  renault: {
    file: 'renault.png',
    source: 'https://commons.wikimedia.org/wiki/File:Renault_2021.svg',
    license: PD,
    holder: 'Renault Group',
    tone: 'color',
    color: '#f2c200',
  },
};

const ALIASES: Readonly<Record<string, string>> = { chevrolet: 'corvette', citroen: 'citroën' };

/**
 * Emblem of a team: by its own name ("Toyota Gazoo Racing"), else by the cars it entered when they
 * are all of one make — a customer team such as The Bend Manthey runs Porsches.
 */
export function teamEmblem(name: string, cars: readonly string[] = []): MakeEmblem | null {
  const own = emblemOf(name);
  if (own) return own;
  const makes = cars.map(emblemOf);
  return makes.length > 0 && makes.every((make) => make && make === makes[0]) ? makes[0] : null;
}

/** Attribution directory shown on the sources pages. */
export const emblemSources = Object.entries(EMBLEMS).map(([name, entry]) => ({
  name:
    ({ bmw: 'BMW', mclaren: 'McLaren', ds: 'DS', nio: 'NIO' } as Record<string, string>)[name] ??
    name.replace(/\b\w/g, (c) => c.toUpperCase()),
  ...entry,
}));

/**
 * Emblem of the manufacturer a name starts with: "Toyota", "Toyota Gazoo Racing",
 * "Mercedes-AMG Team …". Customer teams with their own name ("AF Corse") get none.
 */
export function emblemOf(name: string): MakeEmblem | null {
  const n = name.toLowerCase();
  for (const key of [...Object.keys(EMBLEMS), ...Object.keys(ALIASES)]) {
    if (n === key || n.startsWith(`${key} `) || n.startsWith(`${key}-`)) {
      return EMBLEMS[ALIASES[key] ?? key];
    }
  }
  return null;
}
