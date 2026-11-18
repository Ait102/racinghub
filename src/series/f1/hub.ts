// F1 for the site-wide search and "today in motorsport": the current season from Jolpica.
import { circuitEntries, type SeriesHub } from '../../lib/hub';
import { jolpica } from './api/jolpica';
import { driverName } from './domain/mappers';

export async function loadHub(now = new Date()): Promise<SeriesHub> {
  const year = now.getFullYear();
  const [races, drivers, teams] = await Promise.all([
    jolpica.getRaces(year),
    jolpica.getDriverStandings(year).catch(() => null),
    jolpica.getConstructorStandings(year).catch(() => null),
  ]);
  const lastRound = drivers?.data.round ?? null;
  return {
    series: 'f1',
    label: 'F1',
    season: String(year),
    entries: [
      ...(drivers?.data.rows ?? []).map((row) => ({
        name: driverName(row.driver),
        kind: 'driver' as const,
        to: `/${year}/driver/${row.driver.id}`,
        note: row.constructors.map((c) => c.name).join(', ') || undefined,
      })),
      ...(teams?.data.rows ?? []).map((row) => ({
        name: row.constructor.name,
        kind: 'team' as const,
        to: `/${year}/constructor/${row.constructor.id}`,
      })),
      ...circuitEntries(
        races.data.map((race) => ({
          circuit: race.circuitName,
          to: race.circuitId ? `/${year}/circuit/${race.circuitId}` : null,
          note: race.name,
        })),
      ),
    ],
    races: races.data.flatMap((race) =>
      race.date
        ? [
            {
              name: race.name,
              place: race.circuitName,
              start: race.time ? `${race.date}T${race.time}` : race.date,
              to: `/${year}/race/${race.round}`,
              done: lastRound !== null && race.round <= lastRound,
            },
          ]
        : [],
    ),
  };
}
