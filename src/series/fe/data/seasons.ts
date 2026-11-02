/** URL ids use the starting year; the newest listed season starts this calendar year. */
export function feSeasons(now: Date = new Date()): string[] {
  return Array.from({ length: Math.max(0, now.getFullYear() - 2013) }, (_, index) => {
    const year = now.getFullYear() - index;
    return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
  });
}

export function isSeasonId(id: string | undefined, now: Date = new Date()): id is string {
  return !!id && feSeasons(now).includes(id);
}

export function seasonLabel(id: string): string {
  return id.replace('-', '–');
}

export function seasonArticle(id: string): string {
  return `${seasonLabel(id)} Formula E ${Number(id.slice(0, 4)) >= 2020 ? 'World Championship' : 'Championship'}`;
}

/** Conservative cache boundary: keep results mutable throughout the season's final year. */
export function isPastSeason(id: string, now: Date = new Date()): boolean {
  return Number(id.slice(0, 4)) + 1 < now.getFullYear();
}

export function feSeasonFromPath(pathname: string): string | null {
  const id = /^\/fe\/([^/]+)/.exec(pathname)?.[1];
  return isSeasonId(id) ? id : null;
}

const KEY = 'racinghub:fe:lastSeason';

export function rememberFeSeason(id: string): void {
  if (!isSeasonId(id)) return;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* optional */
  }
}

export function defaultFeSeason(): string {
  try {
    const id = localStorage.getItem(KEY);
    if (isSeasonId(id ?? undefined)) return id!;
  } catch {
    /* optional */
  }
  return feSeasons()[0];
}
