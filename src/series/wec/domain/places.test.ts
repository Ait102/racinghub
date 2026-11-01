import cal2026 from '../__fixtures__/season-2026-calendar.html?raw';
import res2026 from '../__fixtures__/season-2026-results.html?raw';
import { parseSeason } from './parse';
import { placeSeries } from './places';

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
});
