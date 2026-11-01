import type { WecProfile } from './profiles';

export interface SeasonResult {
  team: string | null;
  cls: string | null;
  position: string | null;
  points: string | null;
}

export interface ComparedSeason {
  season: string;
  a: SeasonResult[];
  b: SeasonResult[];
}

/** Keep every source row: a driver can change class or team within one season. */
export function compareSeasons(a: WecProfile, b: WecProfile): ComparedSeason[] {
  const pairs = new Map<string, ComparedSeason>();
  for (const [side, profile] of [
    ['a', a],
    ['b', b],
  ] as const) {
    for (const table of profile.tables.filter((t) => t.kind === 'wec')) {
      const column = (re: RegExp) => table.columns.findIndex((c) => re.test(c));
      const team = column(/^(Team|Entrant)$/i);
      const cls = column(/^Class$/i);
      const position = column(/^(Rank|Pos\.?|Position|DC)$/i);
      const points = column(/^(Points|Pts\.?)$/i);
      for (const row of table.rows) {
        const text = (index: number) => row.cells[index]?.text || null;
        const pair = pairs.get(row.season) ?? { season: row.season, a: [], b: [] };
        pair[side].push({ team: text(team), cls: text(cls), position: text(position), points: text(points) });
        pairs.set(row.season, pair);
      }
    }
  }
  return [...pairs.values()].sort((x, y) => y.season.localeCompare(x.season));
}
