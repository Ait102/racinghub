import { useResource } from '../../../hooks/useResource';
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
