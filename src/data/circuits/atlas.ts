// Present-day outlines of circuits outside the F1 collection (IMSA, DTM), from track-atlas.
import { ATLAS } from './atlas.generated';
import { COMMONS } from './commons.generated';
import { loadCircuitLayouts } from './index';
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
  for (const entry of [...Object.values(ATLAS), ...Object.values(COMMONS)]) {
    const known = [entry.name, ...entry.aka].map(norm);
    if (wanted.some((n) => known.includes(n))) return { layout: entry.layout, layoutName: entry.layoutName };
  }
  return null;
}

// Circuits whose series layout is the current F1 one (F1DB), by name.
const F1DB_CURRENT: Record<string, string> = {
  hockenheimring: 'hockenheimring',
  hockenheim: 'hockenheimring',
};

/** The newest F1DB layout of such a circuit (e.g. Hockenheim's Grand Prix circuit since 2002). */
export async function f1dbCurrentLayout(
  ...names: Array<string | null | undefined>
): Promise<{ layout: CircuitLayout; layoutName: string } | null> {
  const slug = names.map((n) => (n ? F1DB_CURRENT[norm(n)] : undefined)).find(Boolean);
  if (!slug) return null;
  const layouts = await loadCircuitLayouts(slug);
  const newest = layouts.reduce<CircuitLayout | null>(
    (best, l) =>
      !best || Math.max(...l.eras.map((e) => e[1])) > Math.max(...best.eras.map((e) => e[1])) ? l : best,
    null,
  );
  return newest ? { layout: newest, layoutName: 'Grand Prix Circuit (F1)' } : null;
}
