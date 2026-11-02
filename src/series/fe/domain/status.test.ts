import cal from '../__fixtures__/season-2025-26-calendar.html?raw';
import results from '../__fixtures__/season-2025-26-results.html?raw';
import { parseSeason } from './season';
import { daysUntil, lastCompleted, nextRound, roundStatus } from './status';

const rounds = parseSeason('2025-26', 'Article', cal, results).rounds;
const round = { ...rounds[0], winner: null };

it('marks completed only with a published winner; distinguishes dates and absent dates', () => {
  expect(roundStatus(rounds[0], new Date(2025, 11, 1))).toBe('completed');
  expect(roundStatus(round, new Date(2025, 11, 5))).toBe('upcoming');
  expect(roundStatus(round, new Date(2025, 11, 6))).toBe('live');
  expect(roundStatus(round, new Date(2025, 11, 7))).toBe('awaiting');
  expect(roundStatus({ ...round, start: null }, new Date())).toBe('unknown');
});

it('chooses the next dated race, the last published winner, and whole calendar days', () => {
  expect(nextRound([{ ...rounds[0], winner: null }, ...rounds.slice(1)], new Date(2025, 11, 5))?.round).toBe(
    1,
  );
  expect(nextRound(rounds, new Date(2025, 11, 5))).toBeNull();
  expect(lastCompleted(rounds)?.round).toBe(17);
  expect(lastCompleted([])).toBeNull();
  expect(daysUntil(round, new Date(2025, 11, 5, 23))).toBe(1);
  expect(daysUntil({ ...round, start: null }, new Date())).toBeNull();
});
