// Refresh trimmed, genuine season fixtures of DTM and IMSA (Wikipedia, CC BY-SA 4.0): headings and
// wikitables only. Usage: node scripts/fetch-season-fixtures.mjs <dtm|imsa> [year]
import { writeFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const SERIES = {
  dtm: { years: ['2000', '2021', '2026'], article: (y) => `${y} Deutsche Tourenwagen Masters` },
  imsa: {
    years: ['2014', '2019', '2026'],
    article: (y) => `${y} ${Number(y) <= 2015 ? 'United SportsCar' : 'IMSA SportsCar'} Championship`,
    // Race articles with the full classification ("race-<slug>.html").
    races: ['2026 24 Hours of Daytona', '2026 Grand Prix of Long Beach'],
  },
};
const [series, only] = process.argv.slice(2);
const config = SERIES[series];
if (!config) throw new Error('Usage: node scripts/fetch-season-fixtures.mjs <dtm|imsa> [year]');
const target = new URL(`../src/series/${series}/__fixtures__/`, import.meta.url);

const pages = [
  ...config.years.map((year) => [year, config.article(year), `season-${year}.html`]),
  ...(config.races ?? []).map((page) => [
    page,
    page,
    `race-${page.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`,
  ]),
];
for (const [key, page, file] of pages) {
  if (only && only !== key) continue;
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'parse',
    format: 'json',
    formatversion: '2',
    redirects: '1',
    disableeditsection: '1',
    page,
    prop: 'text',
  });
  const res = await fetch(url, {
    headers: { 'User-Agent': 'RacingHub/0.1 (personal noncommercial project; github.com/Ait102/racinghub)' },
  });
  if (!res.ok) throw new Error(`${page}: HTTP ${res.status}`);
  const json = await res.json();
  if (!json.parse) throw new Error(`${page}: ${json.error?.info ?? 'no article'}`);
  const doc = new JSDOM(json.parse.text).window.document;
  doc.querySelectorAll('style,script,link,sup.reference,.mw-editsection').forEach((el) => el.remove());
  // Flags and logos: only what the parsers read (src without tracking query, alt, size).
  for (const img of doc.querySelectorAll('img')) {
    for (const attr of [...img.attributes])
      if (!['src', 'alt', 'width', 'height'].includes(attr.name)) img.removeAttribute(attr.name);
    img.setAttribute('src', img.getAttribute('src').replace(/\?.*$/, ''));
  }
  const parts = [...doc.querySelectorAll('h2,h3,h4,table.wikitable')]
    .filter((el) => !el.parentElement?.closest('table.wikitable'))
    .map((el) =>
      /^H/.test(el.tagName)
        ? `<${el.tagName.toLowerCase()}>${el.textContent.trim()}</${el.tagName.toLowerCase()}>`
        : el.outerHTML,
    );
  const source = `https://en.wikipedia.org/wiki/${encodeURIComponent(page.replaceAll(' ', '_'))}`;
  writeFileSync(
    new URL(file, target),
    `<!-- Source: ${source}; CC BY-SA 4.0; retrieved ${new Date().toISOString().slice(0, 10)}. -->\n${parts.join('\n')}\n`,
  );
  console.log(file);
}
