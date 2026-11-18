import { describe, expect, it } from 'vitest';

import { entryDrivers } from '../../../lib/wikiEntries';
import { seasonResults } from '../../../lib/wikiProfile';
import manthey from '../__fixtures__/profile-manthey-racing.html?raw';
import ring from '../__fixtures__/profile-red-bull-ring.html?raw';
import preining from '../__fixtures__/profile-thomas-preining.html?raw';
import y2000 from '../__fixtures__/season-2000.html?raw';
import y2026 from '../__fixtures__/season-2026.html?raw';
import { parseDtmEntries } from './participants';
import { parseDtmProfile } from './profiles';

describe('parseDtmEntries', () => {
  it('reads one crew per car with make, model, engine, status marks and rounds', () => {
    const crews = parseDtmEntries(y2026);
    expect(crews).toHaveLength(22);
    expect(crews[1]).toMatchObject({
      number: '8',
      team: { name: 'Comtoyou Racing' },
      manufacturer: 'Aston Martin',
      car: 'Aston Martin Vantage AMR GT3 Evo',
      drivers: [{ driver: { name: 'Nicolas Baert' }, status: 'R', rounds: 'All' }],
    });
  });

  it('keeps a driver who moved between cars in each of them (2000)', () => {
    const lamy = entryDrivers(parseDtmEntries(y2000)).find((d) => d.driver.name === 'Pedro Lamy');
    expect(lamy?.seats.map((s) => [s.number, s.rounds])).toEqual([
      ['14', '1–2'],
      ['24', '3–10'],
    ]);
  });
});

describe('parseDtmProfile', () => {
  it('takes the DTM figures of the infobox, never other series', () => {
    const p = parseDtmProfile('Thomas Preining', preining, 'driver');
    const fact = (label: string) => p.facts.find((f) => f.label === label)?.value;
    expect(fact('Старты')).toBe('79');
    expect(fact('Победы')).toBe('10');
    expect(fact('Национальность')).toBe('Austrian');
    expect(p.tables.map((t) => t.title)).toEqual(['Complete Deutsche Tourenwagen Masters results']);
    expect(seasonResults(p.tables).at(-1)).toMatchObject({ season: '2026', position: '1st', points: '225' });
  });

  it('reads a team and a circuit (the layout the series races on)', () => {
    const team = parseDtmProfile('Manthey Racing', manthey, 'team');
    expect(team.facts.find((f) => f.label === 'Основана')?.value).toBe('1996');
    expect(team.tables[0].title).toBe('Deutsche Tourenwagen Masters');
    const circuit = parseDtmProfile('Red Bull Ring', ring, 'circuit');
    expect(circuit.facts.find((f) => f.label === 'Длина круга')?.value).toMatch(/^4\.326 km/);
    expect(circuit.facts.find((f) => f.label === 'Конфигурация')?.value).toMatch(/Grand Prix Circuit/);
    expect(circuit.tables).toEqual([]);
  });
});
