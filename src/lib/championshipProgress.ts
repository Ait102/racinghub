export interface ChampionshipSeries {
  id: string;
  label: string;
  shortLabel: string;
  group?: string;
  points: (number | null)[];
}

export interface ChampionshipProgress {
  rounds: { label: string; title: string }[];
  series: ChampionshipSeries[];
  sources: { label: string; url: string }[];
}

/** "Nice" axis maximum and step for a points axis. */
export function niceAxis(max: number, ticks = 5): { max: number; step: number } {
  if (max <= 0) return { max: 10, step: 2 };
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  return { max: Math.ceil(max / step) * step, step };
}
