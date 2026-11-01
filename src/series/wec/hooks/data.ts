import { useLocation } from 'react-router-dom';

import { useResource } from '../../../hooks/useResource';
import { wikipedia } from '../api/wikipedia';
import { isSeasonId, wecSeasons } from '../data/seasons';
import type { ProfileKind } from '../domain/profiles';

export function useWecProfile(article: string, kind: ProfileKind) {
  return useResource(`wec:profile:${kind}:${article}`, (force) =>
    wikipedia.getProfile(article, kind, { force }),
  );
}

export function useWecParticipants(id: string | null, drivers: boolean) {
  return useResource(id === null ? null : `wec:participants:${id}:${drivers}`, (force) =>
    wikipedia.getParticipants(id!, drivers, { force }),
  );
}

export function useWecSeason(id: string | null) {
  return useResource(id === null ? null : `wec:season:${id}`, (force) => wikipedia.getSeason(id!, { force }));
}

export function useWecRace(seasonId: string, article: string | null) {
  return useResource(article === null ? null : `wec:race:${article}`, (force) =>
    wikipedia.getRace(article!, seasonId, { force }),
  );
}

/** Season id from a /wec/<season>/… path, if valid. */
export function wecSeasonFromPath(pathname: string): string | null {
  const id = /^\/wec\/([^/]+)/.exec(pathname)?.[1];
  return isSeasonId(id) ? id : null;
}

export function useWecSeasonParam(): string | null {
  return wecSeasonFromPath(useLocation().pathname);
}

const KEY = 'racinghub:wec:lastSeason';

export function rememberWecSeason(id: string): void {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* optional */
  }
}

/** Last season the user looked at, else the newest one. */
export function defaultWecSeason(): string {
  try {
    const v = localStorage.getItem(KEY);
    if (isSeasonId(v ?? undefined)) return v!;
  } catch {
    /* optional */
  }
  return wecSeasons()[0];
}
