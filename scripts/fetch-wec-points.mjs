// Run with a season, e.g. node scripts/fetch-wec-points.mjs 2026.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const classifications = {
  'results-55': 'hypercar-drivers',
  'results-65': 'hypercar-manufacturers',
  'results-66': 'hypercar-teams',
  'results-72': 'lmgt3-drivers',
  'results-73': 'lmgt3-teams',
};
const season = process.argv[2];
const savedHtml = process.argv[3];
if (!/^\d{4}$/.test(season ?? '')) throw new Error('Supply a four-digit WEC season.');
const source = `https://www.fiawec.com/en/season/${season}`;

function documentOf(html) {
  return new JSDOM(html, { virtualConsole: new VirtualConsole() }).window.document;
}

async function request(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.text();
}

function displayName(name) {
  return name
    .toLowerCase()
    .replace(/(^|[\s-])\p{L}/gu, (letter) => letter.toUpperCase())
    .replace(/\b(Van Der|De|Da|Di|By)\b/g, (particle) => particle.toLowerCase())
    .replace(/\b(Bmw|Tf|Wrt|Af|Asp|Dk|Jota|Idec|Pmg)\b/g, (acronym) => acronym.toUpperCase())
    .replace(/\bMc(\p{L})/gu, (_, letter) => `Mc${letter.toUpperCase()}`);
}

function shortName(name) {
  return name.replace(/^.+?\s((?:van der |de |di |da |Pier )?\S+)$/, '$1');
}

function rowsOf(table, kind) {
  if (table.tHead.rows[0].cells[table.tHead.rows[0].cells.length - 1].textContent.trim() !== 'Total points') {
    throw new Error(`Missing Total points column for ${kind}.`);
  }
  return [...table.tBodies[0].rows].flatMap(({ cells }) => {
    const total = cells[cells.length - 1].textContent.trim();
    if (!/^-?\d+(?:\.\d+)?$/.test(total)) throw new Error(`Invalid Total points cell: ${total}`);
    const points = Number(total);
    if (kind.endsWith('manufacturers')) {
      const label = displayName(cells[1].textContent.trim());
      return [{ id: label, label, shortLabel: label, points }];
    }
    const car = cells[2].textContent.trim();
    if (!/^#\d+$/.test(car)) throw new Error(`Invalid championship car number: ${car}`);
    if (kind.endsWith('teams')) {
      const label = `${car} ${displayName(cells[3].textContent.trim())}`;
      return [{ id: car, label, shortLabel: car, points }];
    }
    return [...cells[3].querySelectorAll('a[href*="/driver/"]')].map((link) => {
      const id = link.getAttribute('href').split('/').at(-1);
      const label = displayName(link.textContent.trim());
      return { id, label, shortLabel: shortName(label), group: car, points };
    });
  });
}

function standingsOf(doc, round) {
  const current = doc.querySelector('[data-model="raceId"].bg-primary-subtle')?.dataset.value;
  if (current !== round) throw new Error(`Expected round ${round}, got ${current}.`);
  return Object.fromEntries(
    [...doc.querySelectorAll('table.table-standing')]
      .filter((table) => table.tBodies[0]?.rows.length)
      .map((table) => {
        const kind = classifications[table.parentElement.id];
        if (!kind) throw new Error(`Unrecognized WEC classification: ${table.parentElement.id}`);
        const entries = rowsOf(table, kind);
        if (entries.length === 0 || new Set(entries.map(({ id }) => id)).size !== entries.length) {
          throw new Error(`Missing or duplicate WEC standings in ${kind} at round ${round}.`);
        }
        return [kind, entries];
      }),
  );
}

const base = documentOf(
  await (savedHtml ? readFile(join(savedHtml, `${season}.html`), 'utf8') : request(source)),
);
const component = base.querySelector('[data-live-name-value="Editorial:CMS:StandingComponent"]');
const props = JSON.parse(component.dataset.livePropsValue);
const rounds = [...component.querySelectorAll('[data-model="raceId"]')].map(({ dataset }) => dataset.value);
const snapshots = [];
for (const raceId of rounds) {
  let doc = base;
  if (String(props.raceId) !== raceId) {
    const data = new FormData();
    data.set('data', JSON.stringify({ props, updated: { raceId: Number(raceId) } }));
    const html = await (savedHtml
      ? readFile(join(savedHtml, `${season}-${raceId}.html`), 'utf8')
      : request(new URL(component.dataset.liveUrlValue, source), {
          method: 'POST',
          headers: {
            Accept: 'application/vnd.live-component+html',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Live-Url': new URL(source).pathname,
          },
          body: data,
        }));
    doc = documentOf(html);
  }
  snapshots.push(standingsOf(doc, raceId));
}

// Visit the latest classifications first to retain the published championship order.
const kinds = new Set(snapshots.flatMap(Object.keys));
const lines = [...kinds].map((kind) => {
  const entrants = new Map();
  for (const snapshot of snapshots.toReversed()) {
    for (const row of snapshot[kind] ?? []) {
      if (!entrants.has(row.id)) entrants.set(row.id, row);
    }
  }
  const entries = [...entrants.values()].map(({ id, label, shortLabel, group }) => {
    const points = snapshots.map((snapshot) => snapshot[kind]?.find((row) => row.id === id)?.points ?? null);
    return `    ${JSON.stringify([id, label, shortLabel, group ?? null, points])},`;
  });
  return `  '${kind}': [\n${entries.join('\n')}\n  ],`;
});

await writeFile(
  new URL(`../src/series/wec/data/standingProgress${season}.generated.ts`, import.meta.url),
  `// Generated by scripts/fetch-wec-points.mjs from ${source}.\n` +
    `import type { PublishedStandingPoints } from './standingProgress';\n\n` +
    `export const standingProgress${season}: PublishedStandingPoints = {\n${lines.join('\n')}\n};\n`,
);
