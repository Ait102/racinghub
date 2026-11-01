// Refresh real Wikipedia profile fixtures, keeping only relevant tables.
import { writeFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const pages = [
  ['Sébastien Buemi', 'driver-buemi'],
  ['Kamui Kobayashi', 'driver-kobayashi'],
  ['Toyota Racing GmbH', 'team-toyota'],
  ['AF Corse', 'team-af-corse'],
  ['6 Hours of Spa-Francorchamps', 'event-spa'],
  ['2026 FIA World Endurance Championship', 'season-2026-entries'],
  ['2012 FIA World Endurance Championship', 'season-2012-entries'],
  ['2019–20 FIA World Endurance Championship', 'season-2019-20-entries'],
];
for (const [page, file] of pages) {
  if (process.argv[2] && !file.startsWith(process.argv[2])) continue;
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'parse',
    format: 'json',
    formatversion: '2',
    page,
    prop: 'text',
    redirects: '1',
    disableeditsection: '1',
  });
  const res = await fetch(url, {
    headers: { 'User-Agent': 'RacingHub/0.1 (personal noncommercial project; github.com/Ait102/racinghub)' },
  });
  if (!res.ok) throw new Error(`${page}: HTTP ${res.status}`);
  const json = await res.json();
  if (!json.parse?.text) throw new Error(`${page}: no article`);
  const doc = new JSDOM(json.parse.text).window.document;
  let heading = '';
  let sectionLevel = 0;
  const parts = [];
  for (const el of doc.querySelectorAll('h2,h3,h4,h5,table.wikitable')) {
    if (/^H/.test(el.tagName)) {
      const level = Number(el.tagName.slice(1));
      if (sectionLevel && level <= sectionLevel) sectionLevel = 0;
      heading = el.textContent;
      if (
        /World Endurance Championship.*(results|record)|24 Hours of Le Mans.*results|^Winners$|^(Entries|Entry list|Teams and drivers)$/i.test(
          heading,
        )
      )
        sectionLevel = level;
    } else {
      if (sectionLevel) {
        console.log(
          page,
          heading,
          [...el.rows].slice(0, 2).map((r) => r.textContent.replace(/\s+/g, ' ').trim()),
        );
        el.querySelectorAll('style,script,sup.reference,.mw-editsection').forEach((n) => n.remove());
        parts.push(`<h3>${heading}</h3>\n${el.outerHTML}`);
      }
    }
  }
  const html = `<!-- Source: https://en.wikipedia.org/wiki/${encodeURIComponent(json.parse.title.replaceAll(' ', '_'))}; CC BY-SA 4.0; retrieved ${new Date().toISOString().slice(0, 10)}. -->\n${parts.join('\n')}\n`;
  writeFileSync(new URL(`../src/series/wec/__fixtures__/${file}.html`, import.meta.url), html);
}
