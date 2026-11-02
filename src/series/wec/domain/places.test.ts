import cal2026 from '../__fixtures__/season-2026-calendar.html?raw';
import res2026 from '../__fixtures__/season-2026-results.html?raw';
import { parseSeason } from './parse';
import { placeSeries } from './places';
import type { StandingRow, StandingTable } from './types';

const season = parseSeason('2026', 'x', cal2026, res2026);

describe('placeSeries', () => {
  it('reads numeric places and leaves retirements as gaps', () => {
    const drivers = season.standings[0];
    const [first] = placeSeries(drivers, 1);
    expect(first.label).toBe('Sébastien Buemi');
    expect(first.places[0]).toBe(1);
    expect(first.places).toHaveLength(drivers.rounds.length);

    const manufacturers = season.standings.find((t) => t.kind === 'manufacturers')!;
    const second = placeSeries(manufacturers, 1)[1];
    expect(second.label).toBe('Toyota · машина 2');
    expect(second.places[4]).toBeNull();
    expect(second.texts[4]).toBe('Ret');
  });

  it('takes only the requested rows and draws one line per crew', () => {
    const drivers = season.standings[0];
    expect(placeSeries(drivers, 5).map((s) => s.label)).toEqual([
      'Sébastien Buemi, Brendon Hartley, Ryō Hirakawa',
      'Mike Conway, Kamui Kobayashi',
    ]);
  });

  it('keeps separate manufacturer cars even when their published results match', () => {
    const table = tableWithRows('manufacturers', [
      row('Toyota', ['1', 'Ret'], { lines: [cells('1', 'Ret'), cells('1', 'Ret')] }),
      row('Ferrari', ['1', 'Ret']),
    ]);

    expect(placeSeries(table, 5).map((s) => s.label)).toEqual([
      'Toyota · машина 1',
      'Toyota · машина 2',
      'Ferrari',
    ]);
  });

  it('does not identify different teams or championship positions as one driver crew', () => {
    const table = tableWithRows('drivers', [
      row('A', ['1', 'Ret'], { extra: 'Toyota' }),
      row('B', ['1', 'Ret'], { extra: 'Ferrari' }),
      row('C', ['1', 'Ret'], { extra: 'Toyota', posText: '2', pos: 2 }),
      row('D', ['1', 'Ret'], { extra: null }),
      row('E', ['1', 'Ret'], { extra: null }),
    ]);

    expect(placeSeries(table, 5).map((s) => s.label)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('plots only positive safe integer places and preserves each original cell text', () => {
    const texts = ['1', '0', '9007199254740992', '12†', 'Ret', '', 'NC', '02'];
    const table = tableWithRows('drivers', [row('A', texts)]);

    expect(placeSeries(table, 1)[0]).toMatchObject({
      places: [1, null, null, null, null, null, null, 2],
      texts,
    });
  });

  it('aligns every line with the published round columns instead of plotting surplus cells', () => {
    const table = tableWithRows('drivers', [row('A', ['1', '2', '3'])]);
    table.rounds = [
      { abbr: 'SPA', report: null },
      { abbr: 'LMS', report: null },
    ];
    expect(placeSeries(table, 1)[0].places).toEqual([1, 2]);

    table.rounds.push({ abbr: 'BAH', report: null }, { abbr: 'FUJ', report: null });
    expect(placeSeries(table, 1)[0].texts).toEqual(['1', '2', '3', '']);
  });
});

const cells = (...texts: string[]) => texts.map((text) => ({ text, tone: null }));

function row(name: string, texts: string[], overrides: Partial<StandingRow> = {}): StandingRow {
  return {
    pos: 1,
    posText: '1',
    name: { name, article: null, flag: null },
    extra: 'Toyota',
    lines: [cells(...texts)],
    points: '25',
    pointsValue: 25,
    ...overrides,
  };
}

function tableWithRows(kind: StandingTable['kind'], rows: StandingRow[]): StandingTable {
  return {
    ...season.standings[0],
    kind,
    rounds: rows[0].lines[0].map((_, i) => ({ abbr: `R${i + 1}`, report: null })),
    rows,
  };
}
