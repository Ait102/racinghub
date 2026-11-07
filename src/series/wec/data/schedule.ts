import { scheduleDay, type WeekendScheduleData } from '../../../lib/raceSchedule';

const fp1 = 'Свободная практика 1';
const fp2 = 'Свободная практика 2';
const fp3 = 'Свободная практика 3';
const gtQualifying = 'Квалификация LMGT3';
const gtHyperpole = 'Hyperpole LMGT3';
const hypercarQualifying = 'Квалификация Hypercar';
const hypercarHyperpole = 'Hyperpole Hypercar';
const race = 'Гонка';
const cest = '+02:00';
const cdt = '-05:00';
const brt = '-03:00';
const jst = '+09:00';
const cet = '+01:00';
const source = 'https://www.fiawec.com/en/race/';

// shortcut: published 2026 timetables are bundled; extend when another season's times are needed.
const schedules: Record<string, WeekendScheduleData> = {
  '2026-04-19': {
    source: source + '6-hours-of-imola-2026',
    sessions: [
      ...scheduleDay('2026-04-17', cest, [
        [fp1, '10:15'],
        [fp2, '15:15'],
      ]),
      ...scheduleDay('2026-04-18', cest, [
        [fp3, '10:30'],
        [gtQualifying, '14:30'],
        [gtHyperpole, '14:50'],
        [hypercarQualifying, '15:10'],
        [hypercarHyperpole, '15:30'],
      ]),
      ...scheduleDay('2026-04-19', cest, [[race, '13:00', 'race']]),
    ],
  },
  '2026-05-09': {
    source: source + 'totalenergies-6-hours-of-spa-francorchamps-2026',
    sessions: [
      ...scheduleDay('2026-05-07', cest, [
        [fp1, '11:00'],
        [fp2, '15:40'],
      ]),
      ...scheduleDay('2026-05-08', cest, [
        [fp3, '10:10'],
        [gtQualifying, '14:30'],
        [gtHyperpole, '14:55'],
        [hypercarQualifying, '15:20'],
        [hypercarHyperpole, '15:45'],
      ]),
      ...scheduleDay('2026-05-09', cest, [[race, '14:00', 'race']]),
    ],
  },
  '2026-06-13': {
    source: source + '24-hours-of-le-mans-2026',
    sessions: [
      ...scheduleDay('2026-06-10', cest, [
        [fp1, '14:00'],
        ['Квалификация LMP2 и LMGT3', '18:45'],
        [hypercarQualifying, '19:30'],
        [fp2, '22:00'],
      ]),
      ...scheduleDay('2026-06-11', cest, [
        [fp3, '14:45'],
        ['Hyperpole 1 LMP2 и LMGT3', '20:00'],
        ['Hyperpole 2 LMP2 и LMGT3', '20:35'],
        ['Hyperpole 1 Hypercar', '21:05'],
        ['Hyperpole 2 Hypercar', '21:40'],
        ['Свободная практика 4', '23:00'],
      ]),
      ...scheduleDay('2026-06-13', cest, [
        ['Разминка', '12:00'],
        [race, '16:00', 'race'],
      ]),
    ],
  },
  '2026-07-12': {
    source: source + 'rolex-6-hours-of-sao-paulo-2026',
    sessions: [
      ...scheduleDay('2026-07-10', brt, [
        [fp1, '11:00'],
        [fp2, '15:50'],
      ]),
      ...scheduleDay('2026-07-11', brt, [
        [fp3, '10:10'],
        [gtQualifying, '14:30'],
        [gtHyperpole, '14:50'],
        [hypercarQualifying, '15:10'],
        [hypercarHyperpole, '15:30'],
      ]),
      ...scheduleDay('2026-07-12', brt, [[race, '11:30', 'race']]),
    ],
  },
  '2026-09-06': {
    source: source + 'lone-star-le-mans-2026',
    sessions: [
      ...scheduleDay('2026-09-04', cdt, [
        [fp1, '11:30'],
        [fp2, '16:00'],
      ]),
      ...scheduleDay('2026-09-05', cdt, [
        [fp3, '11:00'],
        [gtQualifying, '15:00'],
        [gtHyperpole, '15:20'],
        [hypercarQualifying, '15:40'],
        [hypercarHyperpole, '16:00'],
      ]),
      ...scheduleDay('2026-09-06', cdt, [[race, '13:00', 'race']]),
    ],
  },
  '2026-09-27': {
    source: source + '6-hours-of-fuji-2026',
    sessions: [
      ...scheduleDay('2026-09-25', jst, [
        [fp1, '10:15'],
        [fp2, '14:30'],
      ]),
      ...scheduleDay('2026-09-26', jst, [[fp3, '09:30']]),
      ...[gtQualifying, gtHyperpole, hypercarQualifying, hypercarHyperpole].map((label) => ({
        label,
        start: null,
        cancelled: true,
      })),
      ...scheduleDay('2026-09-27', jst, [[race, '11:00', 'race']]),
    ],
  },
  '2026-10-18': {
    source: source + '6-hours-of-barcelona-2026',
    sessions: [
      ...scheduleDay('2026-10-16', cest, [
        [fp1, '11:30'],
        [fp2, '16:30'],
      ]),
      ...scheduleDay('2026-10-17', cest, [
        [`${fp3} LMGT3`, '08:50'],
        [gtQualifying, '11:50'],
        [gtHyperpole, '12:10'],
        [`${fp3} Hypercar`, '12:40'],
        [hypercarQualifying, '15:40'],
        [hypercarHyperpole, '16:00'],
      ]),
      ...scheduleDay('2026-10-18', cest, [[race, '12:00', 'race']]),
    ],
  },
  '2026-11-08': {
    source: source + '6-hours-of-monza-2026',
    sessions: [
      ...scheduleDay('2026-11-06', cet, [
        [fp1, '10:30'],
        [fp2, '14:30'],
      ]),
      ...scheduleDay('2026-11-07', cet, [
        [fp3, '10:30'],
        [gtQualifying, '14:20'],
        [gtHyperpole, '14:40'],
        [hypercarQualifying, '15:00'],
        [hypercarHyperpole, '15:20'],
      ]),
      ...scheduleDay('2026-11-08', cet, [[race, '11:00', 'race']]),
    ],
  },
};

export function wecWeekendSchedule(start: string | null): WeekendScheduleData {
  return (
    (start && schedules[start]) || {
      sessions: [],
      source: 'https://www.fiawec.com/en/page/saisons-wec',
    }
  );
}
