import { parseStandings } from './wikiStandings';
import { parseHtml, wikiTables } from './wikitable';

it('reads Formula E Pts headers and keeps both cars and double-header columns', () => {
  const doc = parseHtml(`<h3>Teams' Championship</h3><table class="wikitable">
    <tr><th rowspan="2">Pos.</th><th rowspan="2">Team</th><th rowspan="2">No.</th><th colspan="2"><a href="/wiki/2026_Monaco_ePrix">MON</a></th><th rowspan="2">Pts</th></tr>
    <tr><th>1</th><th>2</th></tr>
    <tr><td rowspan="2">1</td><td rowspan="2"><a href="/wiki/Jaguar_Racing">Jaguar</a></td><td>9</td><td style="background:#ffffbf">1<sup>P</sup></td><td>Ret</td><td rowspan="2">42</td></tr>
    <tr><td>37</td><td>DNS</td><td style="background:#dfdfdf">2</td></tr>
  </table>`);
  expect(parseStandings(doc)).toEqual([]);
  const [table] = parseStandings(doc, wikiTables(doc), { series: 'fe' });
  expect(table.rounds).toHaveLength(2);
  expect(table.rows).toHaveLength(1);
  expect(table.rows[0]).toMatchObject({
    points: '42',
    lines: [
      [
        { text: '1P', tone: 'gold' },
        { text: 'Ret', tone: null },
      ],
      [
        { text: 'DNS', tone: null },
        { text: '2', tone: 'silver' },
      ],
    ],
  });
});
