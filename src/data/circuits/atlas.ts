// Present-day outlines of circuits outside the F1 collection (IMSA, DTM), from track-atlas.
import { ATLAS } from './atlas.generated';
import type { CircuitLayout } from './types';

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** The circuit's current layout by any of its names (article, short name); null when not in the atlas. */
export function atlasCircuit(
  ...names: Array<string | null | undefined>
): { layout: CircuitLayout; layoutName: string } | null {
  const wanted = names.filter((n): n is string => !!n).map(norm);
  for (const entry of Object.values(ATLAS)) {
    const known = [entry.name, ...entry.aka].map(norm);
    if (wanted.some((n) => known.includes(n))) return { layout: entry.layout, layoutName: entry.layoutName };
  }
  return null;
}
