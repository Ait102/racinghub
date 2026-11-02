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
