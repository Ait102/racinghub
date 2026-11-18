// IMSA for the site-wide search and "today in motorsport": the newest season on Wikipedia.
import { circuitEntries, standingEntries, type SeriesHub } from '../../lib/hub';
import { validArticle } from '../../lib/wikiArticle';
import { imsaWikipedia } from './api/wikipedia';
import { imsaRaceStart } from './data/schedule';
import { imsa } from './data/seasons';
import type { ImsaStanding } from './domain/season';

export async function loadHub(now = new Date()): Promise<SeriesHub> {
  const season = imsa.seasons(now)[0];
  const { data } = await imsaWikipedia.getSeason(season);
  return {
    series: 'imsa',
    label: 'IMSA',
    season,
    // A name without an article leads to its class standings.
    entries: [
      ...standingEntries(
        data.standings,
        (who, table) =>
          who.article && validArticle(who.article)
            ? `/imsa/${season}/${table.kind === 'drivers' ? 'driver' : 'team'}/${encodeURIComponent(who.article)}`
            : `/imsa/${season}/standings?t=${table.id}`,
        (table) => (table as ImsaStanding).cls,
      ),
      ...circuitEntries(
        data.races.map((race) => ({
          circuit: race.circuit?.name,
          to:
            race.circuit?.article && validArticle(race.circuit.article)
              ? `/imsa/${season}/circuit/${encodeURIComponent(race.circuit.article)}`
              : null,
          note: race.name,
        })),
      ),
    ],
    races: data.races.flatMap((race) =>
      race.start
        ? [
            {
              name: race.name,
              place: race.circuit?.name ?? null,
              start: imsaRaceStart(season, race.round) ?? race.start,
              end: race.end ?? undefined,
              to: `/imsa/${season}/race/${race.round}`,
              done: race.winners.length > 0,
            },
          ]
        : [],
    ),
  };
}
