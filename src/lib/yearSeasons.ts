// Seasons named by a single calendar year (IMSA, DTM): ids "2026", newest first, plus the
// remembered choice per series. A failed localStorage only means the newest season is opened.

export function yearSeasons(first: number, now: Date = new Date()): string[] {
  return Array.from({ length: Math.max(0, now.getFullYear() - first + 1) }, (_, i) =>
    String(now.getFullYear() - i),
  );
}

export function createYearSeasons(series: string, first: number) {
  const key = `racinghub:${series}:lastSeason`;
  const seasons = (now?: Date) => yearSeasons(first, now);
  const isSeasonId = (id: string | undefined, now?: Date): id is string => !!id && seasons(now).includes(id);
  return {
    seasons,
    isSeasonId,
    /** Season id from a /<series>/<season>/… path, if valid. */
    fromPath(pathname: string): string | null {
      const id = new RegExp(`^/${series}/([^/]+)`).exec(pathname)?.[1];
      return isSeasonId(id) ? id : null;
    },
    remember(id: string): void {
      try {
        localStorage.setItem(key, id);
      } catch {
        /* optional */
      }
    },
    /** Last season the user looked at, else the newest one. */
    defaultSeason(): string {
      try {
        const id = localStorage.getItem(key);
        if (isSeasonId(id ?? undefined)) return id!;
      } catch {
        /* optional */
      }
      return seasons()[0];
    },
  };
}
