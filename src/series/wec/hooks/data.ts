import { useEffect, useState } from 'react';
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

// Parsed once per season: every emblem on a page asks for the same entry list.
const teamCarsBySeason = new Map<string, Promise<Map<string, string[]>>>();
const NO_CARS: ReadonlyMap<string, string[]> = new Map();

function loadTeamCars(season: string): Promise<Map<string, string[]>> {
  let cars = teamCarsBySeason.get(season);
  if (!cars) {
    cars = wikipedia.getParticipants(season, false).then(({ data }) => {
      const map = new Map<string, string[]>();
      for (const team of data) {
        const names = team.cars.map((car) => car.name);
        if (team.who.article) map.set(team.who.article, names);
        map.set(team.who.name, names);
      }
      return map;
    });
    cars.catch(() => teamCarsBySeason.delete(season));
    teamCarsBySeason.set(season, cars);
  }
  return cars;
}

/** Cars each team entered in the season, by team article and name; empty until loaded or on failure. */
export function useWecTeamCars(season: string | null): ReadonlyMap<string, string[]> {
  const [loaded, setLoaded] = useState<{ season: string; cars: ReadonlyMap<string, string[]> } | null>(null);
  useEffect(() => {
    if (!season) return;
    let alive = true;
    loadTeamCars(season).then(
      (cars) => alive && setLoaded({ season, cars }),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [season]);
  return loaded?.season === season ? loaded.cars : NO_CARS;
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
