// Weekend timetables of IMSA and DTM from official sources, kept in generated data files:
//   DTM  — the timetable of every event on api.dtm.com (UTC times, also for coming events);
//   IMSA — the session folders of the official results (imsa.results.alkamelcloud.com), named by
//          the local start time ("202601241340_Race"): known once a session has run.
//
//   node scripts/fetch-schedules.mjs dtm [year]
//   node scripts/fetch-schedules.mjs imsa [year]
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

async function imsa(year) {
  const base = 'https://imsa.results.alkamelcloud.com/';
  const id = `${year.slice(2)}_${year}`;
  const index = await get(`${base}?season=${id}`);
  const events = [...index.matchAll(/<option Value="(\d\d_[^"]+)"/g)].map((m) => m[1]);
  const rounds = {};
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
