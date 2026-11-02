import { parseStandings, type Named } from '../../../lib/wikiStandings';
import { columnIndex, parseHtml, wikiTables, type WikiCell } from '../../../lib/wikitable';
import type { FeRound, FeSeasonData } from './types';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** FE calendars publish a separate date for each race, including double headers. */
export function parseDate(text: string): string | null {
  const match = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const month = MONTHS.findIndex((name) => name.toLowerCase() === match[2].toLowerCase());
  const day = Number(match[1]);
  const year = Number(match[3]);
  if (month < 0 || new Date(Date.UTC(year, month, day)).getUTCDate() !== day) return null;
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function named(cell: WikiCell | undefined): Named | null {
  if (!cell?.text || /^(?:—|-|TBA|TBD)$/i.test(cell.text)) return null;
  return {
    name: cell.text,
    article: cell.links[0]?.title ?? null,
    flag: cell.flags[0] ?? null,
  };
}

export function parseSeason(
  id: string,
  article: string,
  calendarHtml: string,
  resultsHtml: string,
): FeSeasonData {
  const calendar = wikiTables(parseHtml(calendarHtml)).find(
    (table) =>
      columnIndex(table, /^Round$/i) === 0 &&
      columnIndex(table, /^(?:e-?prix|Race)$/i) > 0 &&
      columnIndex(table, /^Date$/i) > 0,
  );
  const rounds: FeRound[] = [];
  if (calendar) {
    const race = columnIndex(calendar, /^(?:e-?prix|Race)$/i);
    const circuit = columnIndex(calendar, /^(?:Circuit|Track)$/i);
    const country = columnIndex(calendar, /^Country$/i);
    const date = columnIndex(calendar, /^Date$/i);
    for (const row of calendar.rows) {
      if (!/^\d+$/.test(row[0]?.text ?? '') || row[0]?.el === row[race]?.el) continue;
      const dateText = row[date]?.text ?? '';
      const start = parseDate(dateText);
      rounds.push({
        round: Number(row[0].text),
        name: row[race]?.text ?? '',
        circuit: named(row[circuit]),
        country: row[country]?.flags[0]
          ? { ...row[country].flags[0], country: row[country].text || row[country].flags[0].country }
          : null,
        dateText,
        start,
        end: start,
        report: null,
        winner: null,
        winningTeam: null,
        pole: null,
        fastestLap: null,
        raceNumber: null,
      });
    }
    // Shared source event cells identify double headers even before race reports exist.
    for (let index = 0; index < rounds.length; index++) {
      const round = rounds[index];
      const sameEvent = rounds.filter((other) => other.name === round.name);
      if (sameEvent.length > 1) round.raceNumber = sameEvent.indexOf(round) + 1;
    }
  }
  const results = parseHtml(resultsHtml);
  const winners = wikiTables(results).find(
    (table) => columnIndex(table, /^Round$/i) === 0 && columnIndex(table, /Winning driver$/i) > 0,
  );
  if (winners) {
    const col = (pattern: RegExp) => columnIndex(winners, pattern);
    const winner = col(/Winning driver$/i);
    const team = col(/Winning team$/i);
    const pole = col(/Pole position$/i);
    const fastest = col(/Fastest lap$/i);
    const report = col(/Report$/i);
    for (const row of winners.rows) {
      if (!/^\d+$/.test(row[0]?.text ?? '')) continue;
      const round = rounds.find((value) => value.round === Number(row[0].text));
      if (!round) continue;
      round.winner = named(row[winner]);
      round.winningTeam = named(row[team]);
      round.pole = named(row[pole]);
      round.fastestLap = named(row[fastest]);
      round.report = row[report]?.links[0]?.title ?? null;
    }
  }
  return { id, article, rounds, standings: parseStandings(results, undefined, { series: 'fe' }) };
}
