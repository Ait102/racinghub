// Entry list ("Teams and drivers"): works before the first race, includes substitutes.
import type { Named } from '../../../lib/wikiStandings';
import { columnIndex, parseHtml, wikiTables, type WikiCell, type WikiLine } from '../../../lib/wikitable';

export interface FeParticipant {
  who: Named;
  /** Car numbers as published. */
  numbers: string[];
  /** For a driver — the teams; for a team — its drivers. */
  partners: Named[];
  /** Powertrain names, e.g. "Jaguar I-Type 7". */
  powertrains: string[];
}

const namedLine = (line: WikiLine): Named | null => {
  const name = line.text || line.link?.text;
  if (!name || /^(TBA|TBC|TBD|—|-)$/i.test(name)) return null;
  return { name, article: line.link?.title ?? null, flag: line.flag };
};

const firstNamed = (cell: WikiCell | undefined): Named | null =>
  cell?.lines.map(namedLine).find((n): n is Named => n !== null) ?? null;

function addUnique<T>(list: T[], value: T | null | undefined, key: (v: T) => string): void {
  if (value && !list.some((x) => key(x) === key(value))) list.push(value);
}

export function parseFeParticipants(html: string, drivers: boolean): FeParticipant[] {
  const entries = new Map<string, FeParticipant>();
  const byName = (n: Named) => n.article ?? n.name;
  for (const table of wikiTables(parseHtml(html))) {
    const team = columnIndex(table, /^(Team|Entrant)/i);
    const driver = columnIndex(table, /^Drivers?/i);
    if (team < 0 || driver < 0) continue;
    const number = columnIndex(table, /^No\.?$/i);
    const powertrain = columnIndex(table, /^Powertrain/i);
    for (const row of table.rows) {
      const teamCell = row[team];
      const driverCell = row[driver];
      if (!teamCell || !driverCell || teamCell.header || teamCell.el === driverCell.el) continue;
      const teamName = firstNamed(teamCell);
      const num = number >= 0 ? row[number]?.text.trim() : '';
      const engine = powertrain >= 0 ? row[powertrain]?.text.trim() : '';
      const people = driverCell.lines.map(namedLine).filter((n): n is Named => n !== null);
      const subjects = drivers ? people : teamName ? [teamName] : [];
      for (const who of subjects) {
        const entry = entries.get(byName(who)) ?? { who, numbers: [], partners: [], powertrains: [] };
        addUnique(entry.numbers, num || null, (x) => x);
        addUnique(entry.powertrains, engine || null, (x) => x);
        for (const partner of drivers ? [teamName] : people) addUnique(entry.partners, partner, byName);
        entries.set(byName(who), entry);
      }
    }
  }
  return [...entries.values()];
}
