import type { FeRound } from './types';

export type FeStatus = 'completed' | 'live' | 'upcoming' | 'awaiting' | 'unknown';
export const FE_STATUS_LABELS: Record<FeStatus, string> = {
  completed: 'Завершён',
  live: 'Идёт',
  upcoming: 'Предстоящий',
  awaiting: 'Ждём результаты',
  unknown: 'Дата не указана',
};

function localDay(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function roundStatus(round: FeRound, now: Date): FeStatus {
  if (round.winner) return 'completed';
  if (!round.start || !round.end) return 'unknown';
  const today = localDay(now);
  if (today < round.start) return 'upcoming';
  return today <= round.end ? 'live' : 'awaiting';
}

export function nextRound(rounds: FeRound[], now: Date): FeRound | null {
  return rounds.find((round) => ['live', 'upcoming'].includes(roundStatus(round, now))) ?? null;
}

export function lastCompleted(rounds: FeRound[]): FeRound | null {
  return [...rounds].reverse().find((round) => round.winner) ?? null;
}

export function daysUntil(round: FeRound, now: Date): number | null {
  if (!round.start) return null;
  const [year, month, day] = round.start.split('-').map(Number);
  return Math.round(
    (Date.UTC(year, month - 1, day) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
      86_400_000,
  );
}
