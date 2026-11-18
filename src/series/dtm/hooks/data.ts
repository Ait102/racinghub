import { useResource } from '../../../hooks/useResource';
import type { SeriesProfileKind } from '../../../lib/wikiProfile';
import { dtmWikipedia } from '../api/wikipedia';

export function useDtmSeason(id: string | null) {
  return useResource(id === null ? null : `dtm:season:${id}`, (force) =>
    dtmWikipedia.getSeason(id!, { force }),
  );
}

export function useDtmParticipants(id: string | null) {
  return useResource(id === null ? null : `dtm:participants:${id}`, (force) =>
    dtmWikipedia.getParticipants(id!, { force }),
  );
}

export function useDtmProfile(article: string | null, kind: SeriesProfileKind) {
  return useResource(article === null ? null : `dtm:profile:${kind}:${article}`, (force) =>
    dtmWikipedia.getProfile(article!, kind, { force }),
  );
}
