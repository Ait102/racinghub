// Refresh trimmed, genuine Formula E Wikipedia fixtures (CC BY-SA 4.0).
import { mkdirSync, writeFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const target = new URL('../src/series/fe/__fixtures__/', import.meta.url);
mkdirSync(target, { recursive: true });
const selected = process.argv[2];
const pages = [
  ...['2014-15', '2019-20', '2025-26'].map((id) => ({
    page: `${id.replace('-', '–')} Formula E ${Number(id.slice(0, 4)) >= 2020 ? 'World Championship' : 'Championship'}`,
    file: `season-${id}`,
    season: true,
  })),
  { page: '2026 Monaco ePrix', file: 'race-2026-monaco' },
  { page: '2025 São Paulo ePrix', file: 'race-2025-sao-paulo' },
  { page: '2026 London ePrix', file: 'race-2026-london' },
  { page: 'Pascal Wehrlein', file: 'driver-wehrlein' },
  { page: 'Mitch Evans', file: 'driver-evans' },
  { page: 'Jaguar Racing (Formula E)', file: 'team-jaguar' },
  { page: 'Monaco ePrix', file: 'eprix-monaco' },
];
// Profile articles keep the infobox, the lead and only the Formula E results tables.
const PROFILE_HEADING = /Formula E.*results|^Results$|^Winners$/i;

async function request(page, prop, section) {
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'parse',
    format: 'json',
    formatversion: '2',
    redirects: '1',
    disableeditsection: '1',
    disabletoc: '1',
    disablelimitreport: '1',
    page,
    prop,
    ...(section ? { section } : {}),
  });
  let res = await fetch(url, {
    headers: { 'User-Agent': 'RacingHub/0.1 (personal noncommercial project; github.com/Ait102/racinghub)' },
  });
  if (res.status === 429) {
    const wait = Number(res.headers.get('retry-after')) || 10;
    if (wait > 60) throw new Error(`${page}: HTTP 429; retry after ${wait}s`);
    console.log(`${page}: HTTP 429; waiting ${wait}s`);
    await new Promise((resolve) => setTimeout(resolve, wait * 1000));
    res = await fetch(url, {
      headers: {
        'User-Agent': 'RacingHub/0.1 (personal noncommercial project; github.com/Ait102/racinghub)',
      },
    });
  }
  if (!res.ok) throw new Error(`${page}: HTTP ${res.status}`);
  const json = await res.json();
  if (!json.parse) throw new Error(`${page}: ${json.error?.info ?? 'no article'}`);
  return json.parse;
}

function save(page, file, html) {
  const doc = new JSDOM(html).window.document;
  doc.querySelectorAll('style,script,sup.reference,.mw-editsection').forEach((el) => el.remove());
  const parts = [];
  if (/^(driver|team|eprix)-/.test(file)) {
    const infobox = doc.querySelector('table.infobox');
    if (infobox) parts.push(infobox.outerHTML);
    const root = doc.querySelector('.mw-parser-output') ?? doc.body;
    for (const element of root.children) {
      if (/^H[2-6]$/.test(element.tagName) || element.classList.contains('mw-heading')) break;
      if (element.tagName === 'P' && element.textContent.trim().length >= 50) {
        parts.push(element.outerHTML);
        break;
      }
    }
    let level = 0;
    for (const element of doc.querySelectorAll('h2,h3,h4,h5,table.wikitable')) {
      if (/^H/.test(element.tagName)) {
        const current = Number(element.tagName.slice(1));
        if (level && current <= level) level = 0;
        if (PROFILE_HEADING.test(element.textContent.trim())) {
          level = current;
          parts.push(`<h${current}>${element.textContent.trim()}</h${current}>`);
        }
      } else if (level && !element.parentElement?.closest('table.wikitable')) parts.push(element.outerHTML);
    }
  } else if (file.startsWith('race-')) {
    for (const infobox of doc.querySelectorAll('table.infobox')) parts.push(infobox.outerHTML);
    const root = doc.querySelector('.mw-parser-output') ?? doc.body;
    for (const element of root.children) {
      if (/^H[2-6]$/.test(element.tagName) || element.classList.contains('mw-heading')) break;
      if (element.tagName === 'P' && element.textContent.trim().length >= 50) {
        parts.push(element.outerHTML);
        break;
      }
    }
    let classification = false;
    for (const element of doc.querySelectorAll('h2,h3,h4,h5,h6,table')) {
      if (element.tagName === 'H2') classification = /^Classification$/i.test(element.textContent.trim());
      // Duel brackets are plain tables, and sit alongside the race's wikitables.
      if (classification && !element.parentElement?.closest('table')) parts.push(element.outerHTML);
    }
  } else {
    parts.push(
      ...[...doc.querySelectorAll('h2,h3,h4,h5,h6,table.wikitable')]
        .filter((el) => !el.parentElement?.closest('table.wikitable'))
        .map((el) => el.outerHTML),
    );
  }
  const source = `https://en.wikipedia.org/wiki/${encodeURIComponent(page.replaceAll(' ', '_'))}`;
  writeFileSync(
    new URL(`${file}.html`, target),
    `<!-- Source: ${source}; CC BY-SA 4.0; retrieved ${new Date().toISOString().slice(0, 10)}. -->\n${parts.join('\n')}\n`,
  );
  console.log(file);
}

for (const { page, file, season } of pages) {
  if (selected && !file.startsWith(selected)) continue;
  if (!season) {
    const article = await request(page, 'text');
    save(article.title, file, article.text);
    continue;
  }
  const article = await request(page, 'sections');
  for (const [suffix, heading] of [
    ['calendar', /^Calendar$/i],
    ['results', /^(Results and standings|Race results|Championship standings)$/i],
    ['entries', /^Teams and drivers$/i],
  ]) {
    const sections = article.sections.filter((s) => s.toclevel === 1 && heading.test(s.line));
    if (!sections.length) throw new Error(`${page}: no ${suffix} section`);
    const parts = [];
    for (const section of sections) parts.push((await request(page, 'text', section.index)).text);
    save(article.title, `${file}-${suffix}`, parts.join('\n'));
  }
}
