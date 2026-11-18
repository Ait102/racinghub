// Formula E for the site-wide search and "today in motorsport". The newest season gives the races;
// before its first race it has no standings yet, so names come from the season before.
import { standingEntries, type SeriesHub } from '../../lib/hub';
import { validArticle } from '../../lib/wikiArticle';
import { wikipedia } from './api/wikipedia';
import { feSeasons, seasonLabel } from './data/seasons';

export async function loadHub(now = new Date()): Promise<SeriesHub> {
  const [newest, previous] = feSeasons(now);
  const current = (await wikipedia.getSeason(newest)).data;
  const named = current.standings.length || !previous ? current : (await wikipedia.getSeason(previous)).data;
  return {
    series: 'fe',
    label: 'Formula E',
    season: seasonLabel(newest),
    entries: standingEntries(
      named.standings,
      (who, table) =>
        who.article && validArticle(who.article)
          ? `/fe/${named.id}/${table.kind === 'drivers' ? 'driver' : 'team'}/${encodeURIComponent(who.article)}`
          : `/fe/${named.id}/standings`,
      () => `сезон ${seasonLabel(named.id)}`,
    ),
    races: current.rounds.flatMap((round) =>
      round.start
        ? [
            {
              name: round.name,
              place: round.circuit?.name ?? round.country?.country ?? null,
              start: round.start,
              end: round.end ?? undefined,
              to: `/fe/${newest}/race/${round.round}`,
              done: !!round.winner,
            },
          ]
        : [],
    ),
  };
}
