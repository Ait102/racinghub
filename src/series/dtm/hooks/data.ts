import { useResource } from '../../../hooks/useResource';
import { dtmWikipedia } from '../api/wikipedia';

export function useDtmSeason(id: string | null) {
  return useResource(id === null ? null : `dtm:season:${id}`, (force) =>
    dtmWikipedia.getSeason(id!, { force }),
  );
}
