// DTM for the site-wide search and "today in motorsport": the newest season on Wikipedia.
import { standingEntries, type SeriesHub } from '../../lib/hub';
import { dtmWikipedia } from './api/wikipedia';
import { dtm } from './data/seasons';

export async function loadHub(now = new Date()): Promise<SeriesHub> {
  const season = dtm.seasons(now)[0];
  const { data } = await dtmWikipedia.getSeason(season);
  return {
    series: 'dtm',
    label: 'DTM',
    season,
    // No profile pages yet: a name leads to its standings.
    entries: standingEntries(data.standings, (_, table) => `/dtm/${season}/standings?t=${table.id}`),
    races: data.races.flatMap((race) =>
      race.date
        ? [
            {
              name: `Этап ${race.round}${race.race ? ` · гонка ${race.race}` : ''}`,
              place: race.circuit?.name ?? null,
              start: race.date,
              to: `/dtm/${season}/race/${race.index}`,
              done: !!race.winner || !!race.note,
            },
          ]
        : [],
    ),
  };
}
