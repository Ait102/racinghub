// Loads every championship's hub (see src/lib/hub.ts) once per visit. Each series sits in its own
// chunk; a series that fails to load is reported, the others still show.
import { useEffect, useState } from 'react';

import type { HubSeriesId, SeriesHub } from '../lib/hub';

const LOADERS: Record<HubSeriesId, () => Promise<SeriesHub>> = {
  f1: () => import('../series/f1/hub').then((m) => m.loadHub()),
  wec: () => import('../series/wec/hub').then((m) => m.loadHub()),
  fe: () => import('../series/fe/hub').then((m) => m.loadHub()),
  imsa: () => import('../series/imsa/hub').then((m) => m.loadHub()),
  dtm: () => import('../series/dtm/hub').then((m) => m.loadHub()),
};

export const HUB_LABELS: Record<HubSeriesId, string> = {
  f1: 'F1',
  wec: 'WEC',
  fe: 'Formula E',
  imsa: 'IMSA',
  dtm: 'DTM',
};

export interface Hubs {
  hubs: SeriesHub[];
  failed: HubSeriesId[];
}

let loading: Promise<Hubs> | null = null;

export function loadHubs(): Promise<Hubs> {
  loading ??= Promise.all(
    (Object.keys(LOADERS) as HubSeriesId[]).map((id) =>
      LOADERS[id]().then(
        (hub) => ({ id, hub }),
        () => ({ id, hub: null }),
      ),
    ),
  ).then((all) => {
    const result = {
      hubs: all.flatMap(({ hub }) => (hub ? [hub] : [])),
      failed: all.flatMap(({ id, hub }) => (hub ? [] : [id])),
    };
    // A failed series is tried again on the next visit to the page or the search.
    if (result.failed.length) loading = null;
    return result;
  });
  return loading;
}

/** Hubs of all series; nothing is requested until `enabled`. */
export function useHubs(enabled = true): Hubs | null {
  const [hubs, setHubs] = useState<Hubs | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    loadHubs().then((h) => alive && setHubs(h));
    return () => {
      alive = false;
    };
  }, [enabled]);
  return hubs;
}
