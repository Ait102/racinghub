// Sessions of a DTM season from the official results: practice, qualifying and races, each with
// its classification as published (times, gaps, laps and points are the timing's own text).
export interface DtmSessionRow {
  pos: number | null;
  number: string;
  driver: string;
  nationality: string;
  team: string;
  car: string;
  time: string;
  gap: string;
  laps: number | null;
  bestLap: string;
  status: string;
  points: string | null;
}

export interface DtmSession {
  /** Event (round) number of the season. */
  round: number;
  order: number;
  name: string;
  label: string;
  kind: 'practice' | 'qualifying' | 'race';
  start: string | null;
  rows: DtmSessionRow[];
}

const LABELS: Array<[RegExp, (m: RegExpExecArray) => string]> = [
  [/^Free Practice (\d)$/i, (m) => `Свободная практика ${m[1]}`],
  [/^Qualifying (\d) Group ([AB])$/i, (m) => `Квалификация ${m[1]}, группа ${m[2]}`],
  [/^Qualifying (\d)$/i, (m) => `Квалификация ${m[1]}`],
  [/^Race (\d)$/i, (m) => `Гонка ${m[1]}`],
];

export function sessionLabel(name: string): string {
  for (const [re, f] of LABELS) {
    const m = re.exec(name.trim());
    if (m) return f(m);
  }
  return name;
}

/** "PREINING Thomas" → "Thomas Preining". */
export function driverName(name: string): string {
  const words = name.trim().split(/\s+/);
  const family: string[] = [];
  while (words.length > 1 && words[0] === words[0].toUpperCase() && /\p{Lu}/u.test(words[0]))
    family.push(words.shift()!);
  const cap = (w: string) => w.charAt(0) + w.slice(1).toLowerCase();
  // Particles stay lower case before the rest of the family name: "van der Linde".
  const surname = family.map((w, i) =>
    i < family.length - 1 && /^(VAN|DER|DEN|DE|DA|DI|VON|LE|LA)$/.test(w)
      ? w.toLowerCase()
      : w.split('-').map(cap).join('-'),
  );
  return [...words, ...surname].join(' ');
}

type Raw = Record<string, unknown>;
const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));

export function parseDtmSessions(json: unknown): DtmSession[] {
  const list = ((json as { wigeResultses?: Raw[] }).wigeResultses ?? []) as Raw[];
  const out: DtmSession[] = [];
  for (const item of list) {
    let data: Raw;
    try {
      data = JSON.parse(str(item.jsonText)) as Raw;
    } catch {
      continue;
    }
    const sessions = (data.sessions ?? []) as Raw[];
    const own = sessions.find((s) => s.sessionid === data.sessionid);
    const name = str(own?.name);
    const type = str(own?.type);
    // Only DTM's own sessions: not the pit stop challenge or the track safari.
    if (!own || !/^(Free Practice|Qualifying|Race)\b/i.test(name)) continue;
    const result = Object.values((data.result ?? {}) as Record<string, Raw>);
    out.push({
      round: Number(item.wigeEventId) % 100,
      order: Number(own.order) || 0,
      name,
      label: sessionLabel(name),
      kind: type === 'race' ? 'race' : type === 'qualifying' ? 'qualifying' : 'practice',
      start: str(own.timeStart) || null,
      rows: result.map((r) => ({
        pos: typeof r.position === 'number' ? r.position : Number(r.position) || null,
        number: str(r.number),
        driver: driverName(str(r.name)),
        nationality: str(r.nationality),
        team: str(r.team),
        car: str(r.car),
        time: str(r.time),
        gap: str(r.gap),
        laps: typeof r.laps === 'number' ? r.laps : null,
        bestLap: str(r.fastestlap),
        status: str(r.status),
        points: r.totalpoints !== undefined ? str(r.totalpoints) : null,
      })),
    });
  }
  return out.sort((a, b) => a.round - b.round || a.order - b.order);
}
