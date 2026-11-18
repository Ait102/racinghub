// WEC for the site-wide search and "today in motorsport": the newest season on Wikipedia.
import { standingEntries, type SeriesHub } from '../../lib/hub';
import { validArticle } from '../../lib/wikiArticle';
import { wikipedia } from './api/wikipedia';
import { wecSeasons } from './data/seasons';

export async function loadHub(now = new Date()): Promise<SeriesHub> {
  const season = wecSeasons(now)[0];
  const { data } = await wikipedia.getSeason(season);
  return {
    series: 'wec',
    label: 'WEC',
    season,
    entries: standingEntries(
      data.standings,
      (who, table) =>
        who.article && validArticle(who.article)
          ? `/wec/${season}/${table.kind === 'drivers' ? 'driver' : 'team'}/${encodeURIComponent(who.article)}`
          : `/wec/${season}/standings`,
      (table) => table.title,
    ),
    races: data.rounds.flatMap((round) =>
      round.start
        ? [
            {
              name: round.name,
              place: round.circuit?.name ?? round.location,
              start: round.start,
              end: round.end ?? undefined,
              to: `/wec/${season}/race/${round.round}`,
              done: round.winners.length > 0,
            },
          ]
        : [],
    ),
  };
}
