// Parsing real (trimmed) Wikipedia articles from three eras of the championship.
import race2012 from '../__fixtures__/race-2012-silverstone.html?raw';
import raceFuji from '../__fixtures__/race-2026-fuji.html?raw';
import raceLeMans from '../__fixtures__/race-2026-lemans.html?raw';
import cal2012 from '../__fixtures__/season-2012-calendar.html?raw';
import res2012 from '../__fixtures__/season-2012-results.html?raw';
import cal1920 from '../__fixtures__/season-2019-20-calendar.html?raw';
import res1920 from '../__fixtures__/season-2019-20-results.html?raw';
import cal2026 from '../__fixtures__/season-2026-calendar.html?raw';
import res2026 from '../__fixtures__/season-2026-results.html?raw';
import { classesOf, parseDates, parseRace, parseSeason } from './parse';

describe('parseDates', () => {
  it('reads single days, ranges and split-season years', () => {
    expect(parseDates('19 April', '2026')).toEqual({ start: '2026-04-19', end: '2026-04-19' });
    expect(parseDates('13–14 June', '2026')).toEqual({ start: '2026-06-13', end: '2026-06-14' });
    expect(parseDates('23/24 July 2019', '2019-20')).toEqual({ start: '2019-07-23', end: '2019-07-24' });
    expect(parseDates('23 February 2020', '2019-20')).toEqual({ start: '2020-02-23', end: '2020-02-23' });
    expect(parseDates('30 November – 1 December', '2024')).toEqual({
      start: '2024-11-30',
      end: '2024-12-01',
    });
    expect(parseDates('24 October[a]', '2026').start).toBe('2026-10-24');
    expect(parseDates('TBA', '2026')).toEqual({ start: null, end: null });
  });
});

describe('season 2026 (Hypercar era)', () => {
  const s = parseSeason('2026', 'x', cal2026, res2026);

  it('lists rounds with circuits, countries and class winners', () => {
    expect(s.rounds).toHaveLength(8);
    expect(s.classes).toEqual(['Hypercar', 'LMGT3']);
    const lm = s.rounds[2];
    expect(lm).toMatchObject({
      round: 3,
      name: '24 Hours of Le Mans',
      start: '2026-06-13',
      end: '2026-06-14',
    });
    expect(lm.circuit?.article).toBe('Circuit de la Sarthe');
    expect(lm.country?.country).toBe('France');
    expect(lm.report).toBe('2026 24 Hours of Le Mans');
    expect(lm.winners[0]).toMatchObject({ cls: 'Hypercar', number: '7' });
    expect(lm.winners[0].team?.name).toBe('Toyota Racing');
    expect(lm.winners[0].drivers.map((d) => d.name)).toEqual([
      'Mike Conway',
      'Kamui Kobayashi',
      'Nyck de Vries',
    ]);
  });

  it('keeps an upcoming round without winners and lists cancelled races apart', () => {
    expect(s.rounds[7]).toMatchObject({ name: '6 Hours of Monza', winners: [], report: null });
    expect(s.cancelled.map((c) => c.name)).toEqual(['Qatar 1812 km', '8 Hours of Bahrain']);
  });

  it('reads every championship with its own title, kind and round columns', () => {
    const titles = s.standings.map((t) => [t.title, t.kind]);
    expect(titles).toContainEqual(["Hypercar World Endurance Drivers' Championship", 'drivers']);
    expect(titles).toContainEqual(["Hypercar World Endurance Manufacturers' Championship", 'manufacturers']);
    const drivers = s.standings[0];
    expect(drivers.rounds.map((r) => r.abbr).slice(0, 3)).toEqual(['IMO', 'SPA', 'LMS']);
    expect(drivers.rounds[2].report).toBe('2026 24 Hours of Le Mans');
    expect(drivers.rows[0]).toMatchObject({ pos: 1, posText: '1', points: '114', pointsValue: 114 });
    expect(drivers.rows[0].name).toMatchObject({ name: 'Sébastien Buemi', article: 'Sébastien Buemi' });
    expect(drivers.rows[0].lines[0][0]).toEqual({ text: '1', tone: 'gold' });
  });

  it('keeps both cars of a manufacturer on one row', () => {
    const m = s.standings.find((t) => t.kind === 'manufacturers')!;
    expect(m.rows[0].name.name).toBe('Toyota');
    expect(m.rows[0].lines).toHaveLength(2);
    expect(m.rows[0].lines[1][4]).toEqual({ text: 'Ret', tone: 'retired' });
  });

  it('names a team trophy by the team, with the car number aside', () => {
    const teams = s.standings.find((t) => t.kind === 'teams')!;
    expect(teams.rows[0]).toMatchObject({ extra: '№ 33', points: '92' });
    expect(teams.rows[0].name.name).toBe('TF Sport');
  });
});

describe('season 2019–20 (super season)', () => {
  const s = parseSeason('2019-20', 'x', cal1920, res1920);

  it('reads dates across two years and skips the prologue', () => {
    expect(s.rounds).toHaveLength(8);
    expect(s.rounds[0]).toMatchObject({ round: 1, start: '2019-09-01' });
    expect(s.rounds[4]).toMatchObject({ name: 'Lone Star Le Mans', start: '2020-02-23' });
    expect(s.cancelled.map((c) => c.name)).toEqual(['6 Hours of São Paulo', '1000 Miles of Sebring']);
  });

  it('has the four classes of the time', () => {
    expect(s.classes).toEqual(['LMP1', 'LMP2', 'LMGTE Pro', 'LMGTE Am']);
    expect(s.standings.length).toBeGreaterThanOrEqual(6);
  });
});

describe('season 2012 (first season)', () => {
  const s = parseSeason('2012', 'x', cal2012, res2012);

  it('reads shared positions and half points as published', () => {
    const drivers = s.standings[0];
    expect(drivers.rows[0]).toMatchObject({ posText: '1=', pos: 1, points: '172.5', pointsValue: 172.5 });
    expect(drivers.extraHeader).toBe('Team');
  });

  it('keeps dropped points text untouched', () => {
    const m = s.standings.find((t) => t.title === "Manufacturers' World Championship")!;
    expect(m.rows[0].points).toBe('173 (209)');
    expect(m.rows[0].pointsValue).toBe(173);
  });
});

describe('race articles', () => {
  it('reads the classification with crews, chassis and engine', () => {
    const r = parseRace('2026 6 Hours of Fuji', raceFuji);
    const [first] = r.classification;
    expect(first).toMatchObject({
      pos: 1,
      cls: 'Hypercar',
      number: '8',
      chassis: 'Toyota TR010 Hybrid',
      engine: 'Toyota H8909 3.5 L Turbo V6',
      tyre: 'M',
      laps: 203,
      time: '6:01:01.299',
    });
    expect(first.drivers.map((d) => d.name)).toEqual(['Sébastien Buemi', 'Brendon Hartley', 'Ryō Hirakawa']);
    expect(first.drivers[1].flag?.country).toBe('New Zealand');
    const last = r.classification[r.classification.length - 1];
    expect(last).toMatchObject({ posText: 'DNF', pos: null });
    expect(classesOf(r.classification)).toEqual(['Hypercar', 'LMGT3']);
    expect(r.qualifying).toBeNull();
    expect(r.practice.map((p) => p.title)).toEqual(['Practice 1', 'Practice 2', 'Practice 3']);
    expect(r.practice[0].rows[0]).toMatchObject({ cls: 'Hypercar', number: '8', time: '1:29.694' });
  });

  it('reads qualifying with Hyperpole columns', () => {
    const r = parseRace('2026 24 Hours of Le Mans', raceLeMans);
    expect(r.qualifying?.timeColumns).toEqual(['Qualifying', 'Hyperpole 1', 'Hyperpole 2']);
    expect(r.qualifying?.rows[0]).toMatchObject({ pos: 1, cls: 'Hypercar', number: '15', grid: '1' });
    expect(r.qualifying?.rows[0].times).toEqual(['3:23.625', '3:23.280', '3:22.564']);
    expect(r.practice).toHaveLength(4);
  });

  it('reads the 2012 layout, including an exclusion', () => {
    const r = parseRace('2012 6 Hours of Silverstone', race2012);
    expect(r.classification[0]).toMatchObject({ cls: 'LMP1', number: '1', laps: 194, time: '6:00:39.594' });
    expect(r.classification.some((e) => e.posText === 'EX' && e.time === 'Excluded')).toBe(true);
    expect(r.qualifying?.timeColumns).toEqual(['Lap', 'Gap']);
    expect(r.qualifying?.rows[0].driver?.name).toBe('Benoît Tréluyer');
  });
});
