// Finishing places per race, read from a standings table exactly as the source publishes them.
import type { StandingTable } from './types';

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
 * Co-drivers of one car share every result, so identical series become one line with all their names.
 */
export function placeSeries(table: StandingTable, limit: number): PlaceSeries[] {
  const byResults = new Map<string, PlaceSeries>();
  table.rows.slice(0, limit).forEach((row, i) =>
    row.lines.forEach((line, k) => {
      const texts = line.map((c) => c.text);
      const label = row.lines.length > 1 ? `${row.name.name} · машина ${k + 1}` : row.name.name;
      const key = texts.join('\u0000');
      const same = byResults.get(key);
      if (same) same.label += `, ${label}`;
      else
        byResults.set(key, {
          id: `${i}-${k}`,
          label,
          texts,
          places: texts.map((t) => (/^\d+$/.test(t) ? Number(t) : null)),
        });
    }),
  );
  return [...byResults.values()].filter((s) => s.places.some((p) => p !== null));
}
