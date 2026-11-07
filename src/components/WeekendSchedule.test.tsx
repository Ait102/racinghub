import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import feCalendar from '../series/fe/__fixtures__/season-2025-26-calendar.html?raw';
import { feWeekendSchedule, isFeSprintWeekend } from '../series/fe/data/schedule';
import { parseSeason as parseFeSeason } from '../series/fe/domain/season';
import wecCalendar from '../series/wec/__fixtures__/season-2026-calendar.html?raw';
import { wecWeekendSchedule } from '../series/wec/data/schedule';
import { parseSeason as parseWecSeason } from '../series/wec/domain/parse';
import { WeekendSchedule } from './WeekendSchedule';

describe('race weekend schedule', () => {
  it('matches the published schedules to every round in the covered season calendars', () => {
    const fe = parseFeSeason('2025-26', 'Formula E', feCalendar, '');
    const wec = parseWecSeason('2026', 'WEC', wecCalendar, '');

    expect(fe.rounds.filter((round) => feWeekendSchedule(fe.id, round).sessions.length)).toHaveLength(17);
    expect(wec.rounds.filter((round) => wecWeekendSchedule(round.start).sessions.length)).toHaveLength(8);
  });

  it('uses the published race start and shows cancelled WEC qualifying', () => {
    render(<WeekendSchedule schedule={wecWeekendSchedule('2026-09-27')} />);

    expect(screen.getAllByText('Отменена')).toHaveLength(4);
    const race = screen.getByText('Гонка').closest('li')!;
    expect(race.querySelector('time')).toHaveAttribute('datetime', '2026-09-27T02:00:00Z');
    expect(screen.getByRole('link', { name: 'Официальное расписание ↗' })).toHaveAttribute(
      'href',
      'https://www.fiawec.com/en/race/6-hours-of-fuji-2026',
    );
  });

  it('shows revised FE hours and leaves historical double-headers as ordinary races', () => {
    const round = { round: 13, start: '2026-07-05' };
    expect(isFeSprintWeekend('2025-26', round)).toBe(false);
    render(<WeekendSchedule schedule={feWeekendSchedule('2025-26', round)} />);

    const race = screen.getByText('Гонка').closest('li')!;
    expect(race.querySelector('time')).toHaveAttribute('datetime', '2026-07-05T04:05:00Z');
    expect(screen.queryByText(/E-PrixUnleashed/)).not.toBeInTheDocument();
  });

  it('shows the sprint and its own qualifying as confirmed weekend sessions without guessing a date', () => {
    const round = { round: 2, start: '2026-12-19' };
    expect(isFeSprintWeekend('2026-27', round)).toBe(true);
    expect(isFeSprintWeekend('2026-27', { ...round, round: 3 })).toBe(false);
    render(<WeekendSchedule schedule={feWeekendSchedule('2026-27', round)} />);

    const sprint = screen.getByText('Спринт E-PrixUnleashed').closest('li')!;
    expect(within(sprint).getByText('Дата и время не объявлены')).toBeInTheDocument();
    expect(screen.getByText('Квалификация E-PrixUnleashed')).toBeInTheDocument();
    expect(sprint.querySelector('time')).toBeNull();
  });

  it('explains when historical schedules are unavailable', () => {
    render(<WeekendSchedule schedule={wecWeekendSchedule('2012-08-26')} />);
    expect(screen.getByText('Расписание сессий для этого этапа недоступно.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
