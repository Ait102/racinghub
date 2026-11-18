import { useResource } from '../../../hooks/useResource';
import type { SeriesProfileKind } from '../../../lib/wikiProfile';
import { imsaWikipedia } from '../api/wikipedia';

export function useImsaSeason(id: string | null) {
  return useResource(id === null ? null : `imsa:season:${id}`, (force) =>
    imsaWikipedia.getSeason(id!, { force }),
  );
}

export function useImsaRace(season: string, article: string | null) {
  return useResource(article === null ? null : `imsa:race:${season}:${article}`, (force) =>
    imsaWikipedia.getRace(article!, season, { force }),
  );
}

export function useImsaParticipants(id: string | null) {
  return useResource(id === null ? null : `imsa:participants:${id}`, (force) =>
    imsaWikipedia.getParticipants(id!, { force }),
  );
}

export function useImsaProfile(article: string | null, kind: SeriesProfileKind) {
  return useResource(article === null ? null : `imsa:profile:${kind}:${article}`, (force) =>
    imsaWikipedia.getProfile(article!, kind, { force }),
  );
}
