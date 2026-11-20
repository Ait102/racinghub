import { useEffect, useState } from 'react';

import type { CircuitLayout } from '../data/circuits';
import { atlasCircuit, f1dbCurrentLayout } from '../data/circuits/atlas';
import { CircuitLayoutPanel } from './CircuitMap';

type Found = { layout: CircuitLayout; layoutName: string };

/** Present-day outline of an IMSA/DTM circuit, when one of the sources has it; nothing otherwise. */
export function SeriesCircuitMap({
  names,
  title,
}: {
  names: Array<string | null | undefined>;
  title: string | null;
}) {
  const key = names.join('|');
  const sync = atlasCircuit(...names);
  const [loaded, setLoaded] = useState<{ key: string; found: Found | null } | null>(null);
  useEffect(() => {
    if (sync) return;
    let alive = true;
    f1dbCurrentLayout(...key.split('|')).then(
      (found) => alive && setLoaded({ key, found }),
      () => alive && setLoaded({ key, found: null }),
    );
    return () => {
      alive = false;
    };
  }, [key, sync]);
  const found = sync ?? (loaded?.key === key ? loaded.found : null);
  if (!found) return null;
  return (
    <CircuitLayoutPanel shape={found.layout} name={title}>
      <p className="muted small">Современная конфигурация: {found.layoutName}.</p>
    </CircuitLayoutPanel>
  );
}
