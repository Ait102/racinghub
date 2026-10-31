import { cleanText, groupRows, parseHtml, tableGrid, wikiTables } from './wikitable';

const FLAG = (country: string) =>
  `<span class="flagicon"><span><a href="/wiki/${country}" title="${country}"><img alt="${country}" src="//upload.wikimedia.org/flag_${country}.svg.png"></a></span></span>`;

const doc = parseHtml(`
<div class="mw-parser-output">
  <div class="mw-heading mw-heading3"><h3 id="Race">Race results</h3></div>
  <table class="wikitable">
    <tr><th rowspan="2">Pos</th><th rowspan="2">Team</th><th>Chassis</th><th rowspan="2">Laps</th></tr>
    <tr><th>Engine</th></tr>
    <tr><th rowspan="2">1</th><td rowspan="2"><b>${FLAG('Japan')} <a href="/wiki/Toyota_Racing" title="Toyota Racing">Toyota Racing</a></b></td><td>TR010</td><td rowspan="2" style="background:#FFFFBF;">203<sup class="reference">[3]</sup></td></tr>
    <tr><td>H8909 V6</td></tr>
    <tr><th>2</th><td>${FLAG('France')} <a href="/wiki/Alpine">Alpine</a></td><td>A424</td><td style="background-color: #dfffdf">203</td></tr>
  </table>
  <table class="wikitable">
    <tr><th>Drivers</th></tr>
    <tr><td><b>${FLAG('Switzerland')} <a href="/wiki/S%C3%A9bastien_Buemi" title="Sébastien Buemi">Sébastien Buemi</a><br>${FLAG('New_Zealand')} <a href="/wiki/Brendon_Hartley" title="Brendon Hartley">Brendon Hartley</a></b></td></tr>
  </table>
</div>`);

describe('wikitable', () => {
  it('repeats spanned cells in every slot', () => {
    const grid = tableGrid(doc.querySelector('table')!);
    expect(grid[2].map((c) => c.text)).toEqual(['1', 'Toyota Racing', 'TR010', '203']);
    expect(grid[3].map((c) => c.text)).toEqual(['1', 'Toyota Racing', 'H8909 V6', '203']);
    expect(grid[3][0].el).toBe(grid[2][0].el);
  });

  it('names columns from multi-row headers and finds the heading', () => {
    const [t] = wikiTables(doc);
    expect(t.columns).toEqual(['Pos', 'Team', 'Chassis / Engine', 'Laps']);
    expect(t.heading).toBe('Race results');
    expect(t.rows).toHaveLength(3);
  });

  it('reads links, flags, bold and background colors', () => {
    const [t] = wikiTables(doc);
    const team = t.rows[0][1];
    expect(team.links).toEqual([{ title: 'Toyota Racing', text: 'Toyota Racing' }]);
    expect(team.flags[0]).toEqual({
      country: 'Japan',
      src: 'https://upload.wikimedia.org/flag_Japan.svg.png',
    });
    expect(team.bold).toBe(true);
    expect(t.rows[0][3].bg).toBe('#ffffbf');
    expect(t.rows[2][3].bg).toBe('#dfffdf');
    expect(t.rows[0][3].text).toBe('203'); // footnote removed
  });

  it('groups rows that share a spanned cell', () => {
    const [t] = wikiTables(doc);
    expect(groupRows(t.rows, 0).map((g) => g.length)).toEqual([2, 1]);
  });

  it('splits a cell into lines, also inside a bold wrapper', () => {
    const lines = wikiTables(doc)[1].rows[0][0].lines;
    expect(lines.map((l) => [l.text, l.link?.title, l.flag?.country])).toEqual([
      ['Sébastien Buemi', 'Sébastien Buemi', 'Switzerland'],
      ['Brendon Hartley', 'Brendon Hartley', 'New_Zealand'],
    ]);
  });

  it('cleans footnotes, hidden sort keys and embedded CSS', () => {
    const el = parseHtml(
      '<p><style>.x{}</style><span style="display:none">0001</span>Le Mans<sup class="reference">[12]</sup> [a]</p>',
    ).querySelector('p')!;
    expect(cleanText(el)).toBe('Le Mans');
  });
});
