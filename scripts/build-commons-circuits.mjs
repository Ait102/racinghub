// Circuit outlines from free track maps on Wikimedia Commons (and one F1DB layout), for the DTM
// circuits track-atlas lacks. Run: node scripts/build-commons-circuits.mjs
// The SVG is drawn in a headless browser; its longest drawn line is sampled into an outline.
// Length and turns come from the circuit's Wikipedia infobox for the layout named here.
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const UA = { 'User-Agent': 'RacingHub/0.1 (personal noncommercial project)' };
const TRACKS = [
  {
    key: 'norisring',
    name: 'Norisring',
    aka: [],
    file: 'Norisring track map.svg',
    layoutName: 'Street Circuit (1972–present)',
    lengthKm: 2.3,
    turns: 8,
  },
  {
    key: 'oschersleben',
    name: 'Motorsport Arena Oschersleben',
    aka: ['Oschersleben'],
    file: 'Motorsport Arena Oschersleben.svg',
    layoutName: 'Grand Prix Circuit (2007–present)',
    lengthKm: 3.696,
  },
  {
    key: 'nurburgring-sprint',
    name: 'Nürburgring',
    aka: ['Nurburgring'],
    file: 'Circuit Nürburgring-2026-Sprint.svg',
    layoutName: 'Sprint Circuit (2002–present)',
    lengthKm: 3.629,
    turns: 12,
  },
];

async function commons(file) {
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.search = new URLSearchParams({
    action: 'query',
    titles: `File:${file}`,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    format: 'json',
    formatversion: '2',
  });
  const info = (await (await fetch(api, { headers: UA })).json()).query.pages[0].imageinfo[0];
  const meta = info.extmetadata;
  // upload.wikimedia.org throttles scripts: wait and try again a few times.
  let svg = '';
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(info.url.replace(/\?.*$/, ''), { headers: UA });
    svg = await res.text();
    if (res.ok && /^\s*(<\?xml|<svg|<!--)/.test(svg)) break;
    console.log(`${file}: HTTP ${res.status}, waiting`);
    svg = '';
    await new Promise((r) => setTimeout(r, 30000 * (attempt + 1)));
  }
  if (!svg) throw new Error(`${file}: could not download the SVG`);
  const artist = meta.Artist.value.replace(/<[^>]+>/g, '').trim();
  return {
    svg,
    url: info.descriptionurl,
    license: meta.LicenseShortName.value,
    licenseUrl: meta.LicenseUrl?.value,
    artist,
  };
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } });
const out = {};
for (const track of TRACKS) {
  const source = await commons(track.file);
  await page.setContent(
    `<html><body style="margin:0">${source.svg.replace(/<\?xml[^>]*>/, '')}</body></html>`,
  );
  const d = await page.evaluate(() => {
    const svg = document.querySelector('svg');
    svg.setAttribute('width', '1000');
    svg.setAttribute('height', '1000');
    // The track is the longest stroked line on the map (labels and arrows are short).
    let best = null;
    let bestLength = 0;
    for (const el of svg.querySelectorAll('path, polyline, polygon')) {
      const style = getComputedStyle(el);
      if (style.stroke === 'none' || style.display === 'none' || !el.getTotalLength) continue;
      const m = el.getScreenCTM();
      const length = el.getTotalLength() * Math.hypot(m.a, m.b);
      if (length > bestLength) {
        best = el;
        bestLength = length;
      }
    }
    if (!best) return null;
    const m = best.getScreenCTM();
    const total = best.getTotalLength();
    const points = [];
    for (let i = 0; i <= 600; i++) {
      const p = best.getPointAtLength((total * i) / 600);
      points.push([m.a * p.x + m.c * p.y + m.e, m.b * p.x + m.d * p.y + m.f]);
    }
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const scale = 460 / Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY);
    return (
      points
        .map(
          ([x, y], i) =>
            `${i ? 'L' : 'M'}${(20 + (x - minX) * scale).toFixed(1)} ${(20 + (y - minY) * scale).toFixed(1)}`,
        )
        .join('') + 'Z'
    );
  });
  if (!d) throw new Error(`${track.file}: no line`);
  out[track.key] = {
    name: track.name,
    aka: track.aka,
    layoutName: track.layoutName,
    layout: {
      eras: [[0, 9999]],
      lengthKm: track.lengthKm,
      ...(track.turns ? { turns: track.turns } : {}),
      d,
      source: {
        name: `${source.artist} / Wikimedia Commons`,
        url: source.url,
        license: source.license,
        licenseUrl: source.licenseUrl ?? 'https://creativecommons.org/licenses/',
        changes: 'контур взят из схемы и приведён к масштабу; длина и повороты — по Википедии',
      },
    },
  };
  console.log(track.key, d.length);
  await new Promise((r) => setTimeout(r, 1500));
}
await browser.close();

// Hockenheimring: DTM races on the F1 Grand Prix layout since 2002 (F1DB, CC BY 4.0).
const hock = await readFile(
  new URL('../src/data/circuits/shapes/hockenheimring.ts', import.meta.url),
  'utf8',
);
const row = hock.split('\n').find((line) => line.includes('[2018, 2019]'));
const m = /lengthKm: ([\d.]+), turns: (\d+), direction: '(\w+)', d: '([^']+)'/.exec(row ?? '');
if (!m) throw new Error('Hockenheimring layout not found');
out.hockenheim = {
  name: 'Hockenheimring',
  aka: ['Hockenheim'],
  layoutName: 'Grand Prix Circuit (2002–present)',
  layout: {
    eras: [[0, 9999]],
    lengthKm: Number(m[1]),
    turns: Number(m[2]),
    direction: m[3],
    d: m[4],
    source: {
      name: 'F1DB',
      url: 'https://github.com/f1db/f1db',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    },
  },
};

await writeFile(
  new URL('../src/data/circuits/commons.generated.ts', import.meta.url),
  `// Generated by scripts/build-commons-circuits.mjs; do not edit by hand.\n// Each outline keeps the licence of its source map.\nimport type { CircuitLayout } from './types';\n\nexport const COMMONS: Record<string, { name: string; aka: string[]; layoutName: string; layout: CircuitLayout }> = ${JSON.stringify(out)};\n`,
);
console.log(`Bundled ${Object.keys(out).length} outlines.`);
