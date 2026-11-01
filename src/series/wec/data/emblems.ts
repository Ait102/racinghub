// Manufacturer emblems are registered trademarks of their owners. They are shown only to
// identify the manufacturer, next to its name, on a non-commercial fan site.
// Files live in public/logos/ (some are shared with F1): only the emblem, cropped and
// shown in a circle of the manufacturer color. Every file needs a row here with its source and licence.
import type { EmblemEntry } from '../../../components/Emblem';

interface WecEmblem extends EmblemEntry {
  /** Circle color (decorative, not data). */
  color: string;
}

const PD = 'Public domain (PD-textlogo), товарный знак';
const FAIR = 'Несвободный (fair use в Википедии)';

/** Keyed by the manufacturer's name as the source writes it, lower case. */
const EMBLEMS: Readonly<Record<string, WecEmblem>> = {
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
    tone: 'invert',
    color: '#13233d',
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
    tone: 'invert',
    color: '#1b3a8c',
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
};

const ALIASES: Readonly<Record<string, string>> = { chevrolet: 'corvette' };

/**
 * Emblem of the manufacturer a name starts with: "Toyota", "Toyota Gazoo Racing",
 * "Mercedes-AMG Team …". Customer teams with their own name ("AF Corse") get none.
 */
export function emblemOf(name: string): WecEmblem | null {
  const n = name.toLowerCase();
  for (const key of [...Object.keys(EMBLEMS), ...Object.keys(ALIASES)]) {
    if (n === key || n.startsWith(`${key} `) || n.startsWith(`${key}-`)) {
      return EMBLEMS[ALIASES[key] ?? key];
    }
  }
  return null;
}
