// Weekend timetables of IMSA and DTM from official sources, kept in generated data files:
//   DTM  — the timetable of every event on api.dtm.com (UTC times, also for coming events);
//   IMSA — the session folders of the official results (imsa.results.alkamelcloud.com), named by
//          the local start time ("202601241340_Race"): known once a session has run.
//
//   node scripts/fetch-schedules.mjs dtm [year]
//   node scripts/fetch-schedules.mjs imsa [year]
// For IMSA it also keeps the official classification of every session (results CSV of the same
// folders) in src/series/imsa/data/sessions/<year>.ts, loaded only on the race page.
import { readFile, writeFile } from 'node:fs/promises';

const [series, onlyYear] = process.argv.slice(2);
if (!['dtm', 'imsa'].includes(series))
  throw new Error('Usage: node scripts/fetch-schedules.mjs <dtm|imsa> [year]');
const OUT = new URL(`../src/series/${series}/data/schedule.generated.ts`, import.meta.url);
const UA = { 'User-Agent': 'RacingHub/0.1 (personal noncommercial project)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, json = false) {
  await sleep(150);
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return json ? res.json() : res.text();
}

const LABELS = [
  [/^Free practice (\d)$/i, (m) => `Свободная практика ${m[1]}`],
  [/^Practice (\d)$/i, (m) => `Свободная практика ${m[1]}`],
  [/^Free practice$/i, () => 'Свободная практика'],
  [/^Quali\w* (\d) Group ([AB])$/i, (m) => `Квалификация ${m[1]}, группа ${m[2]}`],
  [/^Quali\w* (\d)$/i, (m) => `Квалификация ${m[1]}`],
  [/^Qualifying$/i, () => 'Квалификация'],
  [/^Race (\d)$/i, (m) => `Гонка ${m[1]}`],
  [/^Race$/i, () => 'Гонка'],
  [/^Warm.?up$/i, () => 'Разминка'],
];
const label = (text) => {
  for (const [re, f] of LABELS) {
    const m = re.exec(text.trim());
    if (m) return f(m);
  }
  return text.trim();
};
const kind = (text) => (/^Race\b/i.test(text.trim()) ? 'race' : undefined);

// --- DTM ---------------------------------------------------------------------------------------

async function dtm(year) {
  const { events } = await get('https://api.dtm.com/data?query=events&lang=en', true);
  const rounds = {};
  for (const event of events.filter((e) => e.eventCategory === `DTM ${year}` && e.eventNumber)) {
    const { events: details } = await get(
      `https://api.dtm.com/data?query=eventDetails&slug=${encodeURIComponent(event.slug)}&lang=en`,
      true,
    );
    const sessions = (details[0]?.timetable ?? [])
      .filter((s) => s.raceSeries === 'DTM' && s.start)
      .map((s) => ({ label: label(s.label), start: s.start, ...(kind(s.label) ? { kind: 'race' } : {}) }));
    if (sessions.length)
      rounds[event.eventNumber] = { source: `https://www.dtm.com/en/events/${event.slug}`, sessions };
  }
  return rounds;
}

// --- IMSA --------------------------------------------------------------------------------------

// Time zone of every circuit the WeatherTech championship visits (folder times are local).
const ZONES = [
  [
    /Daytona|Sebring|Watkins|VIR|Virginia|Road Atlanta|Michelin Raceway|Mid-Ohio|Lime Rock/i,
    'America/New_York',
  ],
  [/Long Beach|Laguna|Monterey/i, 'America/Los_Angeles'],
  [/Detroit|Belle Isle/i, 'America/Detroit'],
  [/Canadian Tire|Mosport|CTMP/i, 'America/Toronto'],
  [/Road America|Circuit of the Americas|Austin/i, 'America/Chicago'],
  [/Indianapolis/i, 'America/Indiana/Indianapolis'],
];

/** "2026-01-24 13:40" in a time zone → ISO with that zone's offset on that day. */
function withOffset(local, zone) {
  const guess = new Date(`${local}:00Z`);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
      .formatToParts(guess)
      .map((p) => [p.type, p.value]),
  );
  const shown = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  const minutes = Math.round((shown - guess.getTime()) / 60000);
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  return `${local.replace(' ', 'T')}:00${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

/** Classification of one IMSA session from its results CSV, values as the timing writes them. */
function sessionRows(csv) {
  const [head, ...lines] = csv
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\r?\n/);
  const cols = head.split(';').map((c) => c.trim());
  return lines.filter(Boolean).map((line) => {
    const v = line.split(';');
    const at = (name) => (cols.indexOf(name) >= 0 ? (v[cols.indexOf(name)] ?? '').trim() : '');
    const drivers = [];
    for (let i = 1; i <= 6; i++) {
      const name = `${at(`DRIVER${i}_FIRSTNAME`)} ${at(`DRIVER${i}_SECONDNAME`)}`.trim();
      if (name) drivers.push(name);
    }
    const race = cols.includes('TOTAL_TIME');
    const pos = at('POSITION') || at('POS');
    return [
      pos,
      at('STATUS') === 'Classified' ? '' : at('STATUS'),
      at('NUMBER'),
      at('CLASS'),
      drivers,
      at('TEAM'),
      at('VEHICLE'),
      race ? at('TOTAL_TIME') : '',
      at('GAP_FIRST'),
      at('LAPS'),
      race ? at('FL_TIME') : at('TIME'),
    ];
  });
}

/** Results CSV of a session folder: the official one, the final hour of an endurance race. */
function resultsFile(page, folder) {
  const files = [...page.matchAll(/Results\/[^"'<> ]*?\.CSV/gi)]
    .map((m) => m[0])
    .filter((f) => decodeURIComponent(f).includes(`/${folder}/`) && /03_Results/i.test(f));
  const rank = (f) => (/Official/i.test(f) ? 3 : /Provisional/i.test(f) ? 1 : /Unofficial/i.test(f) ? 0 : 2);
  const hour = (f) => Number(/\/(\d+)_Hour/i.exec(decodeURIComponent(f))?.[1] ?? 99);
  return files.sort((a, b) => hour(b) - hour(a) || rank(b) - rank(a))[0] ?? null;
}

async function imsa(year) {
  const base = 'https://imsa.results.alkamelcloud.com/';
  const id = `${year.slice(2)}_${year}`;
  const index = await get(`${base}?season=${id}`);
  const events = [...index.matchAll(/<option Value="(\d\d_[^"]+)"/g)].map((m) => m[1]);
  const rounds = {};
  const sessionsOut = {};
  let round = 0;
  for (const ev of events) {
    const page = await get(`${base}?season=${id}&evvent=${encodeURIComponent(ev)}`);
    const folders = [
      ...new Set(
        [...page.matchAll(/WeatherTech%20SportsCar%20Championship\/(\d{12})_([^/"']+)\//g)].map(
          (m) => `${m[1]}|${decodeURIComponent(m[2])}`,
        ),
      ),
    ].sort();
    // A championship round is an event of the WeatherTech series with a race.
    if (!folders.some((f) => /\|Race$/i.test(f))) continue;
    round++;
    const zone = ZONES.find(([re]) => re.test(ev))?.[1];
    if (!zone) {
      console.log(`${year}: no time zone for ${ev}, skipped`);
      continue;
    }
    const results = [];
    for (const f of folders) {
      const [stamp, name] = f.split('|');
      const file = resultsFile(page, `${stamp}_${name}`);
      if (!file) continue;
      results.push({
        label: label(name),
        file: decodeURIComponent(file).split('/').pop(),
        rows: sessionRows(await get(base + file)),
      });
    }
    sessionsOut[round] = results;
    rounds[round] = {
      source: `${base}?season=${id}&evvent=${encodeURIComponent(ev)}`,
      sessions: folders.map((f) => {
        const [stamp, name] = f.split('|');
        const local = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)} ${stamp.slice(8, 10)}:${stamp.slice(10, 12)}`;
        return {
          label: label(name),
          start: withOffset(local, zone),
          ...(kind(name) ? { kind: 'race' } : {}),
        };
      }),
    };
  }
  await writeFile(
    new URL(`../src/series/imsa/data/sessions/${year}.ts`, import.meta.url),
    `// Generated by scripts/fetch-schedules.mjs imsa: official session classifications (imsa.results.alkamelcloud.com).\n` +
      `// Row: [position, status, number, class, drivers, team, car, total time, gap, laps, best lap].\n` +
      `import type { ImsaSessionsByRound } from '../sessions';\n\n` +
      `export const SESSIONS: ImsaSessionsByRound = ${JSON.stringify(sessionsOut)};\n`,
  );
  return rounds;
}

// --- output ------------------------------------------------------------------------------------

const MARK = '// DATA';
let all = {};
try {
  const text = await readFile(OUT, 'utf8');
  all = JSON.parse(text.slice(text.indexOf('= {', text.indexOf(MARK)) + 2, text.lastIndexOf(';')));
} catch {
  /* first run */
}
const now = new Date().getFullYear();
const years = onlyYear
  ? [onlyYear]
  : series === 'dtm'
    ? [String(now), String(now + 1)]
    : [String(now - 1), String(now)];
for (const year of years) {
  const rounds = series === 'dtm' ? await dtm(year) : await imsa(year);
  console.log(`${series} ${year}: ${Object.keys(rounds).length} rounds with sessions`);
  if (Object.keys(rounds).length) all[year] = rounds;
}
const sorted = Object.fromEntries(Object.entries(all).sort(([a], [b]) => b.localeCompare(a)));
await writeFile(
  OUT,
  `// Generated by scripts/fetch-schedules.mjs (${series === 'dtm' ? 'api.dtm.com timetables' : 'IMSA official results, session folders'}).\n` +
    `import type { WeekendScheduleData } from '../../../lib/raceSchedule';\n\n` +
    `${MARK}\nexport const scheduleByRound: Record<string, Record<string, WeekendScheduleData>> = ${JSON.stringify(sorted, null, 1)};\n`,
);
