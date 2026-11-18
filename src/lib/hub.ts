// What every championship tells the site-wide pages (search in the header, "today in motorsport"):
// its current season's drivers and teams, and its races with dates. Each series builds this from
// its own source; nothing here is fetched or computed beyond picking and sorting.
import type { Named, StandingTable } from './wikiStandings';

export type HubSeriesId = 'f1' | 'wec' | 'fe' | 'imsa' | 'dtm';

export interface HubEntry {
  name: string;
  kind: 'driver' | 'team' | 'circuit';
  /** Site route of the profile or of the standings that list the name. */
  to: string;
  /** Team, car or class shown next to the name. */
  note?: string;
}

export interface HubRace {
  name: string;
  place: string | null;
  /** ISO date (YYYY-MM-DD) or date-time with zone, as precise as the source. */
  start: string;
  /** Last day of a multi-day race, if different. */
  end?: string;
  to: string;
  /** The source has published a result. */
  done: boolean;
}

export interface SeriesHub {
  series: HubSeriesId;
  label: string;
  season: string;
  entries: HubEntry[];
  races: HubRace[];
}

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Entries whose name (or note) contains every word of the query, ignoring case and accents. */
export function searchHub(
  hubs: SeriesHub[],
  query: string,
  limit = 12,
): Array<HubEntry & { hub: SeriesHub }> {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.join('').length < 2) return [];
  const seen = new Set<string>();
  const out: Array<HubEntry & { hub: SeriesHub }> = [];
  for (const hub of hubs) {
    for (const entry of hub.entries) {
      const hay = fold(`${entry.name} ${entry.note ?? ''}`);
      const key = `${hub.series}|${entry.kind}|${entry.name}`;
      if (seen.has(key) || !words.every((w) => hay.includes(w))) continue;
      seen.add(key);
      out.push({ ...entry, hub });
    }
  }
  // Names that start with the query first, then the rest in series order.
  const first = fold(query.trim());
  return out
    .map((e, i) => ({ e, i, starts: fold(e.name).startsWith(first) ? 0 : 1 }))
    .sort((a, b) => a.starts - b.starts || a.i - b.i)
    .slice(0, limit)
    .map(({ e }) => e);
}

const dayOf = (iso: string) => iso.slice(0, 10);

/** Races not finished yet, soonest first: today's (or running) ones, then the next ones. */
export function upcomingRaces(
  hubs: SeriesHub[],
  now: Date,
  perSeries = 2,
): Array<HubRace & { hub: SeriesHub }> {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return hubs
    .flatMap((hub) =>
      hub.races
        .filter((race) => !race.done && dayOf(race.end ?? race.start) >= today)
        .sort((a, b) => a.start.localeCompare(b.start))
        .slice(0, perSeries)
        .map((race) => ({ ...race, hub })),
    )
    .sort((a, b) => dayOf(a.start).localeCompare(dayOf(b.start)) || a.start.localeCompare(b.start));
}

/** Whole days from today to the race day (0 = today), in local time. */
export function daysTo(race: HubRace, now: Date): number {
  const [y, m, d] = dayOf(race.start).split('-').map(Number);
  return Math.round(
    (Date.UTC(y, m - 1, d) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86_400_000,
  );
}

/** Circuits of the season's races, each once (by name), with the race it hosts as a note. */
export function circuitEntries(
  races: Array<{ circuit: string | null | undefined; to: string | null; note?: string }>,
): HubEntry[] {
  const seen = new Set<string>();
  return races.flatMap(({ circuit, to, note }) => {
    if (!circuit || !to || seen.has(circuit)) return [];
    seen.add(circuit);
    return [{ name: circuit, kind: 'circuit' as const, to, note }];
  });
}

/**
 * Drivers and teams listed in Wikipedia standings tables (each member of a crew sharing a row).
 * `link` gives the site route for a name; manufacturers' tables are left out.
 */
export function standingEntries(
  tables: StandingTable[],
  link: (who: Named, table: StandingTable) => string,
  note?: (table: StandingTable) => string | undefined,
): HubEntry[] {
  const seen = new Set<string>();
  return tables.flatMap((table) => {
    if (table.kind === 'manufacturers') return [];
    const kind = table.kind === 'drivers' ? ('driver' as const) : ('team' as const);
    return table.rows.flatMap((row) =>
      (row.crew ?? [row.name]).flatMap((who) => {
        const key = `${kind}|${who.name}`;
        if (!who.name.trim() || seen.has(key)) return [];
        seen.add(key);
        return [{ name: who.name, kind, to: link(who, table), note: note?.(table) }];
      }),
    );
  });
}
