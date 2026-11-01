// Round status. A round is "completed" only when the source has its result; dates
// alone never mark it finished (Wikipedia is usually updated hours after a race).
import type { WecRound } from './types';

export type WecStatus = 'completed' | 'live' | 'upcoming' | 'awaiting' | 'unknown';

export const WEC_STATUS_LABELS: Record<WecStatus, string> = {
  completed: 'Завершён',
  live: 'Идёт',
  upcoming: 'Предстоящий',
  awaiting: 'Ждём результаты',
  unknown: 'Дата не указана',
};

/** Local calendar date as YYYY-MM-DD. */
function localDay(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function roundStatus(r: WecRound, now: Date): WecStatus {
  if (r.winners.length > 0) return 'completed';
  if (!r.start || !r.end) return 'unknown';
  const today = localDay(now);
  if (today < r.start) return 'upcoming';
  if (today <= r.end) return 'live';
  return 'awaiting';
}

/** The round to look forward to: running now or the next one by date. */
export function nextRound(rounds: WecRound[], now: Date): WecRound | null {
  return rounds.find((r) => ['live', 'upcoming'].includes(roundStatus(r, now))) ?? null;
}

export function lastCompleted(rounds: WecRound[]): WecRound | null {
  return [...rounds].reverse().find((r) => r.winners.length > 0) ?? null;
}

/** Whole days from today to the round's first day (0 = today). */
export function daysUntil(r: WecRound, now: Date): number | null {
  if (!r.start) return null;
  const [y, m, d] = r.start.split('-').map(Number);
  const start = new Date(y, m - 1, d).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((start - today) / 86_400_000);
}

/** The 24 Hours of Le Mans, the crown jewel of the calendar. */
export function isLeMans(r: { name: string }): boolean {
  return /24 (Hours|Heures) (of|du) Le Mans|24 Heures du Mans/i.test(r.name);
}
