// DTM since its revival in 2000 (the 1984–1996 era is a separate series history).
import { createYearSeasons } from '../../../lib/yearSeasons';

export const dtm = createYearSeasons('dtm', 2000);

/** English Wikipedia article of the season. */
export function seasonArticle(id: string): string {
  return `${id} Deutsche Tourenwagen Masters`;
}
