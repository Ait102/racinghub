import { describe, expect, it } from 'vitest';

import y2026 from '../__fixtures__/season-2026.html?raw';
import { parseImsaSeason } from '../domain/season';
import { imsaStandingProgress } from './standingProgress';

const season = parseImsaSeason('2026', '2026 IMSA SportsCar Championship', y2026);
const table = (id: string) => season.standings.find((t) => t.id === id)!;

describe('imsaStandingProgress', () => {
  it('has only the rounds the class ran, totals as published', () => {
    const gtp = imsaStandingProgress('2026', table('gtp-drivers'))!;
    // GTP did not run at CTMP (7) and VIR (9).
    expect(gtp.rounds.map((r) => r.label)).toEqual(['1', '2', '3', '4', '5', '6', '8', '10', '11']);
    expect(gtp.series[0]).toMatchObject({ label: 'Jack Aitken' });
    expect(gtp.series[0].points.at(-1)).toBe(3020);
  });

  it('ends where the Wikipedia standings end (GTP teams and manufacturers)', () => {
    for (const id of ['gtp-teams', 'gtp-manufacturers']) {
      const progress = imsaStandingProgress('2026', table(id))!;
      expect(progress.series[0].label).toBe(table(id).rows[0].name.name);
      expect(progress.series[0].points.at(-1)).toBe(table(id).rows[0].pointsValue);
    }
  });

  it('leaves rounds without official totals empty and seasons without files out', () => {
    const gtp2025 = imsaStandingProgress('2025', table('gtp-drivers'))!;
    expect(gtp2025.series[0].points[2]).toBeNull(); // Long Beach 2025: provisional only
    expect(imsaStandingProgress('2024', table('gtp-drivers'))).toBeNull();
  });
});
