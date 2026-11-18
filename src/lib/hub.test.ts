// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { daysTo, searchHub, standingEntries, upcomingRaces, type SeriesHub } from './hub';
import type { StandingTable } from './wikiStandings';

const hub = (series: SeriesHub['series'], over: Partial<SeriesHub>): SeriesHub => ({
  series,
  label: series.toUpperCase(),
  season: '2026',
  entries: [],
  races: [],
  ...over,
});

const f1 = hub('f1', {
  entries: [
    { name: 'Kimi Antonelli', kind: 'driver', to: '/2026/driver/antonelli', note: 'Mercedes' },
    { name: 'Mercedes', kind: 'team', to: '/2026/constructor/mercedes' },
  ],
  races: [
    { name: 'Las Vegas', place: null, start: '2026-11-22T06:00:00Z', to: '/2026/race/22', done: false },
    { name: 'Brazil', place: null, start: '2026-11-08', to: '/2026/race/21', done: true },
    { name: 'Qatar', place: null, start: '2026-11-29', to: '/2026/race/23', done: false },
    { name: 'Abu Dhabi', place: null, start: '2026-12-06', to: '/2026/race/24', done: false },
  ],
});
const wec = hub('wec', {
  entries: [{ name: 'Sébastien Buemi', kind: 'driver', to: '/wec/2026/driver/x' }],
  races: [
    {
      name: 'Bahrain',
      place: null,
      start: '2026-11-17',
      end: '2026-11-19',
      to: '/wec/2026/race/8',
      done: false,
    },
  ],
});

describe('searchHub', () => {
  it('finds names across series, ignoring case and accents, names starting with the query first', () => {
    expect(searchHub([f1, wec], 'sebas').map((e) => e.name)).toEqual(['Sébastien Buemi']);
    expect(searchHub([f1, wec], 'merc').map((e) => e.name)).toEqual(['Mercedes', 'Kimi Antonelli']);
    expect(searchHub([f1, wec], 'm')).toEqual([]);
  });
});

describe('upcomingRaces', () => {
  it('keeps unfinished races from today on, two per series, soonest first', () => {
    const now = new Date(2026, 10, 18);
    expect(upcomingRaces([f1, wec], now).map((r) => r.name)).toEqual(['Bahrain', 'Las Vegas', 'Qatar']);
    expect(daysTo(wec.races[0], now)).toBe(-1);
  });
});

describe('standingEntries', () => {
  it('splits crews and skips manufacturers', () => {
    const table = (kind: StandingTable['kind'], names: string[]): StandingTable => ({
      id: kind,
      title: kind,
      kind,
      nameHeader: '',
      extraHeader: null,
      rounds: [],
      rows: names.map((name, i) => ({
        pos: i + 1,
        posText: String(i + 1),
        name: { name, article: name, flag: null },
        ...(name.includes(' / ')
          ? { crew: name.split(' / ').map((n) => ({ name: n, article: n, flag: null })) }
          : {}),
        extra: null,
        lines: [],
        points: '0',
        pointsValue: 0,
      })),
    });
    const entries = standingEntries(
      [table('drivers', ['A One / B Two']), table('teams', ['Team']), table('manufacturers', ['Make'])],
      (who, t) => `/${t.kind}/${who.article ?? '-'}`,
    );
    expect(entries.map((e) => [e.name, e.kind, e.to])).toEqual([
      ['A One', 'driver', '/drivers/A One'],
      ['B Two', 'driver', '/drivers/B Two'],
      ['Team', 'team', '/teams/Team'],
    ]);
  });
});
