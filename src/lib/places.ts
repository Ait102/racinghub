// Finishing places per race, read from a standings table exactly as the source publishes them.
import type { StandingTable } from './wikiStandings';

export interface PlaceSeries {
  id: string;
  label: string;
  /** Place per round; null for "Ret", "DSQ", "NC", blanks and anything else that is not a number. */
  places: Array<number | null>;
  /** The cell text per round, so a retirement can still be named. */
  texts: string[];
}

/**
 * One series per scoring car of the first `limit` rows; series without a single numeric place are dropped.
 * Drivers sharing a team, published standing and every result use one line with all names.
 */
export function placeSeries(table: StandingTable, limit: number): PlaceSeries[] {
  const byResults = new Map<string, PlaceSeries>();
  table.rows.slice(0, limit).forEach((row, i) =>
    row.lines.forEach((line, k) => {
      const texts = table.rounds.map((_, j) => line[j]?.text ?? '');
      const label = row.lines.length > 1 ? `${row.name.name} · машина ${k + 1}` : row.name.name;
      // Matching results alone do not identify a crew or a manufacturer's separate cars.
      const key =
        table.kind === 'drivers' && row.extra && row.lines.length === 1
          ? JSON.stringify([row.extra, row.posText, row.points, texts])
          : `${i}-${k}`;
      const same = byResults.get(key);
      if (same) same.label += `, ${label}`;
      else
        byResults.set(key, {
          id: `${i}-${k}`,
          label,
          texts,
          places: texts.map((t) => {
            const p = /^\d+$/.test(t) ? Number(t) : NaN;
            return Number.isSafeInteger(p) && p > 0 ? p : null;
          }),
        });
    }),
  );
  return [...byResults.values()].filter((s) => s.places.some((p) => p !== null));
}
