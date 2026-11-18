// Championship points after every round of Formula E, from the official FIA Formula E results
// (results.formulae.fia.com): each round publishes its "Championships" classification as CSV,
// and the "Points" column there is the total after that round. Nothing is summed here.
//
//   node scripts/fetch-fe-points.mjs            every season with CSV classifications
//   node scripts/fetch-fe-points.mjs 2024-25    one season, the others are kept
//
// Seasons that publish only PDF classifications (2019-20, 2021-22, 2023-24…) are skipped.
import { readFile, writeFile } from 'node:fs/promises';

const BASE = 'https://d112sbqg9gqc2x.cloudfront.net/';
const ROOT = 'formula-e/files/results';
const PAGE = 'https://results.formulae.fia.com/results';
const OUT = new URL('../src/series/fe/data/standingProgress.generated.ts', import.meta.url);
const only = process.argv[2];
if (only && !/^\d{4}-\d{2}$/.test(only)) throw new Error('Season like 2024-25, or nothing for all seasons.');

const url = (id) => BASE + id.split('/').map(encodeURIComponent).join('/');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(id, json = true) {
  await sleep(120); // be gentle with the CDN
  const res = await fetch(json ? `${url(id)}/index.json` : url(id), { signal: AbortSignal.timeout(30000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
  return json ? res.json() : res.text();
}

/** "Mitch EVANS" style names from the CSV → "Mitch Evans"; acronyms stay upper case. */
function displayName(name) {
  return name
    .split(/(\s+|-)/)
    .map((w) => {
      if (/^(DS|NIO|ERT|ABT|BMW|TAG|MSG|II|III)$/.test(w) || /[a-z]/.test(w)) return w;
      return w.charAt(0) + w.slice(1).toLowerCase();
    })
    .join('')
    .replace(/\b(Van Der|Van|De|Da|Di|Du)\b(?= \S)/g, (p) => p.toLowerCase());
}

function parseCsv(text) {
  const [head, ...lines] = text.trim().split(/\r?\n/);
  const columns = head.split(';');
  return lines.filter(Boolean).map((line) => {
    const cells = line.split(';');
    return Object.fromEntries(columns.map((c, i) => [c, cells[i] ?? '']));
  });
}

const KINDS = [
  ['drivers', /Drivers Championship/i],
  ['teams', /Teams Championship/i],
  ['manufacturers', /Manufacturers Championship/i],
];

/** Totals after one round, by kind; null when the round has no CSV classifications. */
async function roundTotals(roundId) {
  const event = await get(roundId);
  const group = event?.items.find(
    (g) => /Formula E.*Championship/i.test(g.title) && !/rookie/i.test(g.title),
  );
  const docs = group && (await get(group.id));
  const champs = docs?.items.filter((d) => /Championships?$/i.test(d.title.replace(/^_/, '')));
  if (!champs?.length) return null;
  const files = (await get(champs.at(-1).id))?.items ?? [];
  const out = {};
  for (const [kind, re] of KINDS) {
    // Amended classifications are published next to the first ones: take the newest CSV.
    const csv = files
      .filter((f) => f.extention === 'csv' && re.test(f.title))
      .sort((a, b) => a.lastModified - b.lastModified)
      .at(-1);
    if (!csv) continue;
    out[kind] = parseCsv(await get(csv.id, false)).map((row) => {
      const points = Number(row.Points);
      if (!Number.isFinite(points)) throw new Error(`${csv.id}: points "${row.Points}"`);
      if (kind === 'drivers') {
        const label = displayName(`${row.DRIVER_NAME} ${row.DRIVER_LASTNAME}`.trim() || row.Participant);
        return { id: row.SHORTNAME || label, label, shortLabel: row.SHORTNAME || label, points };
      }
      // Some teams come in capitals ("DS PENSKE"); others are already written as the team writes them.
      const label = /[a-z]/.test(row.Participant) ? row.Participant : displayName(row.Participant);
      return { id: label, label, shortLabel: label, points };
    });
  }
  return out.drivers ? out : null;
}

async function season(entry) {
  const id = /(\d{4}-\d{2})$/.exec(entry.title)?.[1];
  const rounds = ((await get(entry.id))?.items ?? [])
    .map((r) => ({ id: r.id, m: /^R(\d+)\s+(.+)$/.exec(r.title) }))
    .filter((r) => r.m && Number(r.m[1]) > 0)
    .sort((a, b) => Number(a.m[1]) - Number(b.m[1]));
  if (!id || rounds.length === 0) return null;
  const snapshots = [];
  for (const r of rounds) {
    const totals = await roundTotals(r.id);
    if (!totals) {
      console.log(`${id}: R${r.m[1]} has no CSV classification, season skipped`);
      return null;
    }
    snapshots.push(totals);
  }
  const data = {
    rounds: rounds.map((r) => [`R${r.m[1]}`, r.m[2]]),
  };
  for (const [kind] of KINDS) {
    if (!snapshots.at(-1)[kind]) continue;
    // Published order of the last classification, then anyone who dropped out of it.
    const entrants = new Map();
    for (const snapshot of snapshots.toReversed())
      for (const row of snapshot[kind] ?? []) if (!entrants.has(row.id)) entrants.set(row.id, row);
    data[kind] = [...entrants.values()].map((e) => [
      e.label,
      e.shortLabel,
      snapshots.map((s) => s[kind]?.find((row) => row.id === e.id)?.points ?? null),
    ]);
  }
  console.log(`${id}: ${rounds.length} rounds`);
  return [id, data];
}

const MARK = '// DATA';
let all = {};
try {
  const text = await readFile(OUT, 'utf8');
  all = JSON.parse(text.slice(text.indexOf(MARK) + MARK.length, text.lastIndexOf(';')).replace(/^[^{]*/, ''));
} catch {
  /* first run */
}
const seasons = (await get(ROOT)).items.filter((s) => /Season \d+/.test(s.title));
for (const entry of seasons) {
  if (only && !entry.title.endsWith(only)) continue;
  const result = await season(entry);
  if (result) all[result[0]] = result[1];
}
const sorted = Object.fromEntries(Object.entries(all).sort(([a], [b]) => b.localeCompare(a)));
await writeFile(
  OUT,
  `// Generated by scripts/fetch-fe-points.mjs from ${PAGE} (CSV "Championships" of every round).\n` +
    `import type { FePublishedPoints } from './standingProgress';\n\n` +
    `${MARK}\nexport const fePublishedPoints: Record<string, FePublishedPoints> = ${JSON.stringify(sorted, null, 1)};\n`,
);
