// IMSA WeatherTech SportsCar Championship since its first season in 2014.
import { createYearSeasons } from '../../../lib/yearSeasons';

export const imsa = createYearSeasons('imsa', 2014);

/** English Wikipedia article of the season: 2014–15 ran as the "United SportsCar Championship". */
export function seasonArticle(id: string): string {
  return Number(id) <= 2015 ? `${id} United SportsCar Championship` : `${id} IMSA SportsCar Championship`;
}
