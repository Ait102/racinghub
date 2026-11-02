import { useEffect, useState } from 'react';

import { useResource } from '../../../hooks/useResource';
import { wikipedia } from '../api/wikipedia';
import type { FeProfileKind } from '../domain/profiles';

export function useFeSeason(id: string | null) {
  return useResource(id === null ? null : `fe:season:${id}`, (force) => wikipedia.getSeason(id!, { force }));
}

export function useFeRace(seasonId: string, article: string | null) {
  return useResource(article === null ? null : `fe:race:${seasonId}:${article}`, (force) =>
    wikipedia.getRace(article!, seasonId, { force }),
  );
}

export function useFeParticipants(id: string | null, drivers: boolean) {
  return useResource(id === null ? null : `fe:participants:${id}:${drivers}`, (force) =>
    wikipedia.getParticipants(id!, drivers, { force }),
  );
}

export function useFeProfile(article: string | null, kind: FeProfileKind) {
  return useResource(article === null ? null : `fe:profile:${kind}:${article}`, (force) =>
    wikipedia.getProfile(article!, kind, { force }),
  );
}

// Parsed once per season: every emblem on a page asks for the same entry list.
const powertrainsBySeason = new Map<string, Promise<Map<string, string[]>>>();
const NO_POWERTRAINS: ReadonlyMap<string, string[]> = new Map();

function loadPowertrains(season: string): Promise<Map<string, string[]>> {
  let found = powertrainsBySeason.get(season);
  if (!found) {
    found = wikipedia.getParticipants(season, false).then(({ data }) => {
      const map = new Map<string, string[]>();
      for (const team of data) {
        if (team.who.article) map.set(team.who.article, team.powertrains);
        map.set(team.who.name, team.powertrains);
      }
      return map;
    });
    found.catch(() => powertrainsBySeason.delete(season));
    powertrainsBySeason.set(season, found);
  }
  return found;
}

/** Powertrains each team entered in the season, by team article and name; empty until loaded. */
export function useFeTeamPowertrains(season: string | null): ReadonlyMap<string, string[]> {
  const [loaded, setLoaded] = useState<{ season: string; map: ReadonlyMap<string, string[]> } | null>(null);
  useEffect(() => {
    if (!season) return;
    let alive = true;
    loadPowertrains(season).then(
      (map) => alive && setLoaded({ season, map }),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [season]);
  return loaded?.season === season ? loaded.map : NO_POWERTRAINS;
}
