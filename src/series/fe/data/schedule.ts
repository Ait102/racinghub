import { scheduleDay, type WeekendScheduleData, type WeekendSession } from '../../../lib/raceSchedule';
import type { FeRound } from '../domain/types';

const practice = (number: number) => `Свободная практика ${number}`;
const qualifying = 'Квалификация';
const race = 'Гонка';
const news = 'https://www.fiaformulae.com/en/news/';
const calendar = 'https://www.fiaformulae.com/en/calendar';
const cest = '+02:00';
const cst = '+08:00';
const jst = '+09:00';
const londonTime = '+01:00';
const jeddahTime = '+03:00';

function raceDay(
  date: string,
  offset: string,
  practiceNumber: number,
  [practiceTime, qualifyingTime, raceTime]: [string | null, string, string],
): WeekendSession[] {
  const label = practice(practiceNumber);
  return [
    ...(practiceTime
      ? scheduleDay(date, offset, [[label, practiceTime]])
      : [{ label, start: null, cancelled: true }]),
    ...scheduleDay(date, offset, [
      [qualifying, qualifyingTime],
      [race, raceTime, 'race'],
    ]),
  ];
}

const jeddah = news + 'races/where-and-how-to-watch-formula-e-and-the-2026-jeddah-e-prix-in-japan';
const berlin = news + 'races/where-and-how-to-watch-formula-e-and-the-2026-berlin-e-prix-in-the-europe';
const monaco = news + 'races/where-and-how-to-watch-formula-e-and-the-2026-monaco-e-prix-in-the-uk-ireland';
const shanghai = news + 'races/schedule-update-2026-shanghai-e-prix-rounds-12-13';
const tokyo = news + 'explainers/how-to-watch-the-2026-tdk-tokyo-e-prix';
const london = news + 'races/what-time-is-the-2026-hankook-london-e-prix-and-how-can-i-watch-it';

// shortcut: bundled timetables cover 2025/26 plus Shanghai and Berlin from 2024/25.
const published: Record<string, WeekendScheduleData> = {
  '2025-05-31': {
    source: news + '750864',
    sessions: [
      ...scheduleDay('2025-05-30', cst, [[practice(1), '16:00']]),
      ...raceDay('2025-05-31', cst, 2, ['08:00', '10:20', '15:05']),
    ],
  },
  '2025-06-01': {
    source: news + 'races/schedule-update-2025-shanghai-e-prix-round-11',
    sessions: raceDay('2025-06-01', cst, 3, ['07:00', '09:00', '13:00']),
  },
  '2025-07-12': {
    source: news + '754201',
    update: news + 'races/fp2-statement-2025-hankook-berlin-e-prix',
    sessions: [
      ...scheduleDay('2025-07-11', cest, [[practice(1), '16:00']]),
      ...raceDay('2025-07-12', cest, 2, [null, '11:20', '16:00']),
    ],
  },
  '2025-07-13': {
    source: news + '754201',
    sessions: raceDay('2025-07-13', cest, 3, ['09:00', '11:20', '16:00']),
  },
  '2025-12-06': {
    source: news + 'races/fp1-statement-2025-google-cloud-sao-paulo-e-prix',
    sessions: [
      { label: practice(1), start: null, cancelled: true },
      ...raceDay('2025-12-06', '-03:00', 2, ['07:10', '09:40', '14:05']),
    ],
  },
  '2026-01-10': {
    source: news + 'explainers/how-to-watch-the-2026-mexico-city-e-prix',
    sessions: [
      ...scheduleDay('2026-01-09', '-06:00', [[practice(1), '16:00']]),
      ...raceDay('2026-01-10', '-06:00', 2, ['07:30', '09:40', '14:00']),
    ],
  },
  '2026-01-31': {
    source: news + 'explainers/how-to-watch-the-2026-miami-e-prix',
    sessions: [
      ...scheduleDay('2026-01-30', '-05:00', [
        ['Свободная практика новичков', '14:30'],
        [practice(1), '17:00'],
      ]),
      ...raceDay('2026-01-31', '-05:00', 2, ['07:30', '09:40', '14:05']),
    ],
  },
  '2026-02-13': {
    source: jeddah,
    sessions: [
      ...scheduleDay('2026-02-12', jeddahTime, [[practice(1), '20:00']]),
      ...raceDay('2026-02-13', jeddahTime, 2, ['13:30', '15:40', '20:05']),
    ],
  },
  '2026-02-14': {
    source: jeddah,
    sessions: raceDay('2026-02-14', jeddahTime, 3, ['13:30', '15:40', '20:05']),
  },
  '2026-03-21': {
    source: news + 'races/what-time-is-the-2026-cupra-raval-madrid-e-prix-and-how-can-i-watch-it',
    sessions: [
      ...scheduleDay('2026-03-20', '+01:00', [[practice(1), '16:30']]),
      ...raceDay('2026-03-21', '+01:00', 2, ['08:30', '10:40', '15:05']),
    ],
  },
  '2026-05-02': {
    source: berlin,
    sessions: [
      ...scheduleDay('2026-05-01', cest, [[practice(1), '16:00']]),
      ...raceDay('2026-05-02', cest, 2, ['09:30', '11:40', '16:05']),
    ],
  },
  '2026-05-03': {
    source: berlin,
    sessions: raceDay('2026-05-03', cest, 3, ['09:30', '11:40', '16:05']),
  },
  '2026-05-16': {
    source: monaco,
    sessions: [
      ...scheduleDay('2026-05-16', cest, [[practice(1), '07:30']]),
      ...raceDay('2026-05-16', cest, 2, ['09:10', '10:40', '15:05']),
    ],
  },
  '2026-05-17': {
    source: monaco,
    sessions: raceDay('2026-05-17', cest, 3, ['08:30', '10:40', '15:05']),
  },
  '2026-06-20': {
    source: news + 'races/what-time-is-the-2026-lianxin-sanya-e-prix-and-how-can-i-watch-it',
    sessions: [
      ...scheduleDay('2026-06-19', cst, [[practice(1), '16:30']]),
      ...raceDay('2026-06-20', cst, 2, ['08:30', '10:40', '15:05']),
    ],
  },
  '2026-07-04': {
    source: news + 'races/preview-shanghai-s12',
    update: shanghai,
    sessions: [
      ...scheduleDay('2026-07-03', cst, [[practice(1), '16:00']]),
      ...raceDay('2026-07-04', cst, 2, ['06:00', '08:00', '12:05']),
    ],
  },
  '2026-07-05': {
    source: shanghai,
    sessions: raceDay('2026-07-05', cst, 3, ['06:00', '08:00', '12:05']),
  },
  '2026-07-25': {
    source: tokyo,
    sessions: [
      ...scheduleDay('2026-07-24', jst, [[practice(1), '19:00']]),
      ...raceDay('2026-07-25', jst, 2, ['13:30', '15:40', '20:05']),
    ],
  },
  '2026-07-26': {
    source: tokyo,
    sessions: raceDay('2026-07-26', jst, 3, ['13:30', '15:40', '20:05']),
  },
  '2026-08-15': {
    source: london,
    sessions: [
      ...scheduleDay('2026-08-14', londonTime, [[practice(1), '16:00']]),
      ...raceDay('2026-08-15', londonTime, 2, ['08:30', '10:40', '15:05']),
    ],
  },
  '2026-08-16': {
    source: london,
    sessions: raceDay('2026-08-16', londonTime, 3, ['08:30', '10:40', '15:05']),
  },
};

// Formula E confirms both formats for these weekends without assigning them to a specific round.
const gen4Calendar = news + 'races/formula-e-updates-202627-calendar-and-secures-long-term-future-in-monaco';
const sprintWeekendRounds: Record<string, number> = {
  '2026-12-18': 1,
  '2026-12-19': 2,
  '2027-05-01': 8,
  '2027-05-02': 9,
  '2027-05-08': 10,
  '2027-05-09': 11,
  '2027-05-29': 12,
  '2027-05-30': 13,
  '2027-06-18': 14,
  '2027-06-19': 15,
  '2027-06-26': 16,
  '2027-06-27': 17,
  '2027-07-10': 18,
  '2027-07-11': 19,
  '2027-07-24': 20,
  '2027-07-25': 21,
};

type ScheduledRound = Pick<FeRound, 'round' | 'start'>;

export function isFeSprintWeekend(season: string, round: ScheduledRound): boolean {
  return season === '2026-27' && !!round.start && sprintWeekendRounds[round.start] === round.round;
}

export function feWeekendSchedule(season: string, round: ScheduledRound): WeekendScheduleData {
  if (isFeSprintWeekend(season, round)) {
    return {
      source: gen4Calendar,
      note: 'Программа сдвоенного этапа. Formula E подтвердила оба формата. Дни и время отдельных сессий уточняются.',
      sessions: [
        { label: practice(1), start: null },
        { label: practice(2), start: null },
        { label: 'Квалификация E-PrixUnleashed', start: null, kind: 'sprint' },
        { label: 'Спринт E-PrixUnleashed', start: null, kind: 'sprint' },
        { label: 'Квалификация E-Prix', start: null },
        { label: 'Гонка E-Prix', start: null, kind: 'race' },
      ],
    };
  }
  if (season === '2026-27' && round.round >= 3 && round.round <= 7) {
    return {
      source: gen4Calendar,
      sessions: [
        { label: practice(1), start: null },
        { label: practice(2), start: null },
        { label: qualifying, start: null },
        { label: 'Гонка E-Prix', start: round.start, kind: 'race' },
      ],
    };
  }
  return (
    (round.start && published[round.start]) || {
      sessions: [],
      source: calendar,
    }
  );
}
