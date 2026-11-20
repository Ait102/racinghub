import { useResource } from '../../../hooks/useResource';
import type { SeriesProfileKind } from '../../../lib/wikiProfile';
import { dtmOfficial } from '../api/official';
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

/** Car models each team entered in the season, by team article and name (for make emblems); empty until loaded. */
export function useDtmTeamCars(season: string): (team: { name: string; article: string | null }) => string[] {
  const entries = useDtmParticipants(season);
  return (team) =>
    entries.status !== 'success'
      ? []
      : [
          ...new Set(
            entries.data
              .filter(
                (c) =>
                  c.team &&
                  (c.team.name === team.name || (!!team.article && c.team.article === team.article)),
              )
              .map((c) => c.car)
              .filter(Boolean),
          ),
        ];
}

export function useDtmSessions(season: string) {
  return useResource(`dtm:sessions:${season}`, (force) => dtmOfficial.getSessions(season, { force }));
}
