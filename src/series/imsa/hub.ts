// IMSA for the site-wide search and "today in motorsport": the newest season on Wikipedia.
import { standingEntries, type SeriesHub } from '../../lib/hub';
import { imsaWikipedia } from './api/wikipedia';
import { imsa } from './data/seasons';
import type { ImsaStanding } from './domain/season';

export async function loadHub(now = new Date()): Promise<SeriesHub> {
  const season = imsa.seasons(now)[0];
  const { data } = await imsaWikipedia.getSeason(season);
  return {
    series: 'imsa',
    label: 'IMSA',
    season,
    // No profile pages yet: a name leads to its class standings.
    entries: standingEntries(
      data.standings,
      (_, table) => `/imsa/${season}/standings?t=${table.id}`,
      (table) => (table as ImsaStanding).cls,
    ),
    races: data.races.flatMap((race) =>
      race.start
        ? [
            {
              name: race.name,
              place: race.circuit?.name ?? null,
              start: race.start,
              end: race.end ?? undefined,
              to: `/imsa/${season}/race/${race.round}`,
              done: race.winners.length > 0,
            },
          ]
        : [],
    ),
  };
}
