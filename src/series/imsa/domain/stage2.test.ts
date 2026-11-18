import { describe, expect, it } from 'vitest';

import { seasonResults } from '../../../lib/wikiProfile';
import daytona from '../__fixtures__/profile-daytona-international-speedway.html?raw';
import nasr from '../__fixtures__/profile-felipe-nasr.html?raw';
import wtr from '../__fixtures__/profile-wayne-taylor-racing.html?raw';
import y2019 from '../__fixtures__/season-2019.html?raw';
import y2026 from '../__fixtures__/season-2026.html?raw';
import { parseImsaEntries } from './participants';
import { parseImsaProfile } from './profiles';

// Parsed once: the season fixtures are large.
const crews2026 = parseImsaEntries(y2026);
const crews2019 = parseImsaEntries(y2019);

describe('parseImsaEntries', () => {
  it('assigns each crew its class, also GTD Pro and GTD rows inside one table', () => {
    const count = (crews: ReturnType<typeof parseImsaEntries>) =>
      crews.reduce<Record<string, number>>(
        (acc, c) => ({ ...acc, [c.cls ?? '?']: (acc[c.cls ?? '?'] ?? 0) + 1 }),
        {},
      );
    expect(count(crews2026)).toEqual({ GTP: 11, LMP2: 14, 'GTD Pro': 18, GTD: 25 });
    expect(count(crews2019)).toEqual({ DPi: 11, LMP2: 4, GTLM: 9, GTD: 27 });
    expect(crews2026[1]).toMatchObject({
      cls: 'GTP',
      number: '6',
      team: { name: 'Porsche Penske Motorsport', article: 'Team Penske' },
      car: 'Porsche 963',
      drivers: [{ driver: { name: 'Kévin Estre' }, rounds: 'All' }, {}, {}, {}],
    });
  });
});

describe('parseImsaProfile', () => {
  it('reads the IMSA career box and results tables of a driver', () => {
    const p = parseImsaProfile('Felipe Nasr', nasr, 'driver');
    const fact = (label: string) => p.facts.find((f) => f.label === label)?.value;
    expect(fact('Старты')).toBe('77');
    expect(fact('Победы')).toBe('16');
    expect(fact('Команда')).toBe('Porsche Penske Motorsport');
    expect(p.tables.map((t) => t.title)).toEqual(['Complete IMSA SportsCar Championship results']);
    expect(seasonResults(p.tables).find((r) => r.season === '2024')).toMatchObject({
      cls: 'GTP',
      position: '1st',
    });
  });

  it('reads a team and the sports car course of a circuit', () => {
    expect(parseImsaProfile('Wayne Taylor Racing', wtr, 'team').tables[0].title).toBe(
      'IMSA Sportscar Championship',
    );
    const circuit = parseImsaProfile('Daytona International Speedway', daytona, 'circuit');
    expect(circuit.facts.find((f) => f.label === 'Конфигурация')?.value).toMatch(/^Sports Car Course/);
    expect(circuit.facts.find((f) => f.label === 'Длина круга')?.value).toMatch(/^3\.560 mi/);
  });
});
