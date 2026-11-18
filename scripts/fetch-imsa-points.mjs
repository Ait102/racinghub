// Championship points after every round of IMSA, from the official results (imsa.results.alkamelcloud.com):
// each event publishes "POINTS DATA" CSV files per class and championship, and their "Points" column
// is the total after that event. Nothing is summed here.
//
//   node scripts/fetch-imsa-points.mjs          every season with these files (CSV from 2025; before that
//                                               most events have PDF only, such seasons are skipped)
//   node scripts/fetch-imsa-points.mjs 2025     one season, the others are kept
import { readFile, writeFile } from 'node:fs/promises';

const BASE = 'https://imsa.results.alkamelcloud.com/';
const OUT = new URL('../src/series/imsa/data/standingProgress.generated.ts', import.meta.url);
const only = process.argv[2];
if (only && !/^\d{4}$/.test(only)) throw new Error('Season like 2025, or nothing for every season.');

// Class part of the file names → class code of the Wikipedia standings.
const CLASSES = {
  GTP: 'GTP',
  DPI: 'DPi',
  LMP2: 'LMP2',
  LMP3: 'LMP3',
  GTLM: 'GTLM',
  GTDPRO: 'GTD Pro',
  GTD: 'GTD',
};
const KINDS = { Drivers: 'drivers', Teams: 'teams', Manufacturers: 'manufacturers' };
const FILE = /\/IWSC%20\d+%20([A-Z0-9]+)%20(Drivers|Teams|Manufacturers)\.csv$/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  await sleep(150); // be gentle with the results server
  const res = await fetch(url, {
    signal: AbortSignal.timeout(30000),
    headers: { 'User-Agent': 'RacingHub/0.1' },
  });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

function parseCsv(text) {
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const columns = head.split(';');
  return {
    columns,
    rows: lines.filter(Boolean).map((line) => {
      const cells = line.split(';');
      return Object.fromEntries(columns.map((c, i) => [c, cells[i] ?? '']));
    }),
  };
}

/**
 * Points CSV files of one event, official ones only ("POINTS DATA", "… - Official", "… OFFCIAL").
 * `round` is true when the event has points files at all, even only provisional ones: it is a
 * championship round whose official totals were not published.
 */
function pointsFiles(html) {
  const links = [
    ...new Set(
      [...html.matchAll(/Results\/[^"'<> ]*?WeatherTech%20SportsCar%20Championship\/[^"'<> ]*?\.csv/gi)].map(
        (m) => m[0],
      ),
    ),
  ];
  const files = new Map();
  let round = false;
  for (const link of links) {
    const m = FILE.exec(link);
    const folder = decodeURIComponent(link).split('/').at(-2);
    if (!m || !/points data/i.test(folder)) continue;
    round = true;
    if (/provisional/i.test(folder)) continue;
    const key = `${CLASSES[m[1].toUpperCase()] ?? m[1]}-${KINDS[m[2]]}`;
    const official = /off?ic?ial/i.test(folder);
    if (!files.has(key) || official) files.set(key, { url: BASE + link, official });
  }
  return { files, round };
}

const label = (row, kind) =>
  kind === 'teams' && /^\d+$/.test(row.Participant) ? `#${row.Participant} ${row.Team}` : row.Participant;

async function season(year) {
  const id = `${year.slice(2)}_${year}`;
  const index = await get(`${BASE}?season=${id}`);
  const events = [...index.matchAll(/<option Value="(\d\d_[^"]+)"/g)].map((m) => m[1]);
  // Championship rounds: the events that publish WeatherTech points files, in calendar order.
  const rounds = [];
  for (const ev of events) {
    const { files, round } = pointsFiles(await get(`${BASE}?season=${id}&evvent=${encodeURIComponent(ev)}`));
    if (round) rounds.push({ ev, files });
  }
  if (!rounds.length) return null;
  const missing = rounds.filter((r) => r.files.size === 0).map((r) => r.ev);
  if (missing.length) console.log(`${year}: only provisional totals at ${missing.join(', ')} — left empty`);
  const last = rounds.at(-1).files;
  const data = {};
  for (const [key, file] of last) {
    const kind = key.split('-').at(-1);
    const final = parseCsv(await get(file.url));
    // Races of the season as the final file lists them; a class takes part where its race column is filled.
    const races = [
      ...new Set(
        final.columns.filter((c) => /_Race_Points$/.test(c)).map((c) => c.replace(/_Race_Points$/, '')),
      ),
    ];
    if (races.length !== rounds.length) {
      console.log(`${year}: ${key} lists ${races.length} races for ${rounds.length} events, skipped`);
      continue;
    }
    // "/" marks a race the class did not run.
    const raced = races.map((race) =>
      final.rows.some((row) => !['', '/'].includes(row[`${race}_Race_Points`]?.trim() ?? '')),
    );
    const snapshots = [];
    for (let i = 0; i < rounds.length; i++) {
      if (!raced[i]) continue;
      const f = rounds[i].files.get(key);
      // No official file: the round stays empty (null), provisional totals are not used.
      const rows = f ? parseCsv(await get(f.url)).rows : null;
      snapshots.push({ round: i + 1, race: races[i], rows });
    }
    // Published order of the final classification, then anyone who dropped out of it.
    const entrants = new Map();
    for (const s of snapshots.toReversed())
      for (const row of s.rows ?? [])
        if (!entrants.has(label(row, kind))) entrants.set(label(row, kind), row);
    data[key] = {
      rounds: snapshots.map((s) => [s.round, s.race]),
      series: [...entrants.keys()].map((name) => [
        name,
        snapshots.map((s) => {
          const value = s.rows?.find((row) => label(row, kind) === name)?.Points;
          return value === undefined || value === '' ? null : Number(value);
        }),
      ]),
    };
  }
  console.log(`${year}: ${rounds.length} rounds, ${Object.keys(data).length} championships`);
  return [year, data];
}

const MARK = '// DATA';
let all = {};
try {
  const text = await readFile(OUT, 'utf8');
  all = JSON.parse(text.slice(text.indexOf('= {', text.indexOf(MARK)) + 2, text.lastIndexOf(';')));
} catch {
  /* first run */
}
const now = new Date().getFullYear();
for (let y = 2021; y <= now; y++) {
  if (only && only !== String(y)) continue;
  const result = await season(String(y));
  // A season without usable files (older ones publish the totals as PDF only) is left out.
  if (result && Object.keys(result[1]).length) all[result[0]] = result[1];
  else delete all[String(y)];
}
const sorted = Object.fromEntries(Object.entries(all).sort(([a], [b]) => b.localeCompare(a)));
await writeFile(
  OUT,
  `// Generated by scripts/fetch-imsa-points.mjs from ${BASE} ("POINTS DATA" CSV of every event).\n` +
    `import type { ImsaPublishedPoints } from './standingProgress';\n\n` +
    `${MARK}\nexport const imsaPublishedPoints: Record<string, ImsaPublishedPoints> = ${JSON.stringify(sorted, null, 1)};\n`,
);
