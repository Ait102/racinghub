// WEC seasons since the championship started in 2012. Two seasons spanned two years
// ("super seasons"): 2018–19 and 2019–20; there was no separate 2020 or 2018 season.

export const FIRST_WEC_YEAR = 2012;

/** Season ids as used in URLs: "2012" … "2017", "2018-19", "2019-20", "2021" … */
export function wecSeasons(now: Date = new Date()): string[] {
  const ids: string[] = [];
  for (let y = FIRST_WEC_YEAR; y <= 2017; y++) ids.push(String(y));
  ids.push('2018-19', '2019-20');
  for (let y = 2021; y <= now.getFullYear(); y++) ids.push(String(y));
  return ids.reverse();
}

export const SEASON_ID_RE = /^\d{4}(?:-\d{2})?$/;

export function isSeasonId(id: string | undefined, now: Date = new Date()): id is string {
  return !!id && SEASON_ID_RE.test(id) && wecSeasons(now).includes(id);
}

/** "2018-19" → "2018–19" (as Wikipedia writes it). */
export function seasonLabel(id: string): string {
  return id.replace('-', '–');
}

/** Title of the season article on English Wikipedia. */
export function seasonArticle(id: string): string {
  return `${seasonLabel(id)} FIA World Endurance Championship`;
}

/** Last calendar year the season touches: its results cannot change after that. */
export function seasonEndYear(id: string): number {
  const [start, end] = id.split('-');
  return end ? Number(start.slice(0, 2) + end) : Number(start);
}

export function isPastSeason(id: string, now: Date = new Date()): boolean {
  return seasonEndYear(id) < now.getFullYear();
}
