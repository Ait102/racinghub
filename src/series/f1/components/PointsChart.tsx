import { ChampionshipChart } from '../../../components/ChampionshipChart';
import type { ProgressSeries } from '../domain/progress';
import { teamColor } from './bits';

interface Props {
  rounds: number[];
  series: ProgressSeries[];
  roundLabel: (round: number) => string;
}

/** Dashed line for the second (third…) driver of the same team, so teammates stay distinguishable. */
export function lineStyles(series: ProgressSeries[]): Map<string, { color: string; dash?: string }> {
  const seen = new Map<string, number>();
  const out = new Map<string, { color: string; dash?: string }>();
  for (const s of series) {
    const key = s.team?.id ?? `none:${s.driver.id}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    out.set(s.driver.id, { color: teamColor(s.team), dash: n === 0 ? undefined : n === 1 ? '7 5' : '2 4' });
  }
  return out;
}

export function PointsChart({ rounds, series, roundLabel }: Props) {
  const styles = lineStyles(series);
  return (
    <ChampionshipChart
      rounds={rounds.map((round) => ({ label: String(round), title: roundLabel(round) }))}
      series={series.map(({ driver, points }) => ({
        id: driver.id,
        label: driver.familyName,
        shortLabel: driver.code ?? driver.familyName,
        points,
        ...styles.get(driver.id)!,
      }))}
    />
  );
}
