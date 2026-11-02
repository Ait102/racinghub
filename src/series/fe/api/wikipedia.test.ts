import { ApiError, type GetOptions } from '../../../api/client';
import { createWikipedia } from './wikipedia';

const meta = { provider: 'wiki', sourceUrl: 'api', fetchedAt: '2026-11-02T00:00:00Z', stale: false };
const cal =
  '<table class="wikitable"><tr><th>Round</th><th>Race</th><th>Date</th></tr><tr><th>1</th><td>Test ePrix</td><td>13 September 2014</td></tr></table>';
const results =
  '<table class="wikitable"><tr><th>Round</th><th>Winning driver</th><th>Report</th></tr><tr><th>1</th><td>Driver</td><td><a href="/wiki/Test_ePrix">Report</a></td></tr></table>';
const standings =
  '<h3>Drivers\' Championship</h3><table class="wikitable"><tr><th>Pos.</th><th>Driver</th><th><a href="/wiki/Test_ePrix">TST</a></th><th>Pts</th></tr><tr><th>1</th><td>Driver</td><td>1</td><th>25</th></tr></table>';

it('loads separate historic results and standings sections and preserves source/cache/stale metadata', async () => {
  const get = vi.fn(async (path: string, _options?: GetOptions) => {
    const query = new URLSearchParams(path.slice(1));
    const section = query.get('section');
    return {
      data: {
        parse: section
          ? { text: section === '1' ? cal : section === '2' ? results : standings }
          : {
              sections: [
                { index: '1', line: 'Calendar', toclevel: 1 },
                { index: '2', line: 'Race results', toclevel: 1 },
                { index: '3', line: 'Championship standings', toclevel: 1 },
              ],
            },
      },
      meta: { ...meta, stale: section === '3' },
    };
  });
  const wiki = createWikipedia({ get });
  const season = await wiki.getSeason('2014-15');
  expect(get).toHaveBeenCalledTimes(4);
  expect(get.mock.calls.every(([, options]) => (options as { immutable?: boolean })?.immutable)).toBe(true);
  expect(season.data.rounds).toHaveLength(1);
  expect(season.data.standings).toHaveLength(1);
  expect(season.meta.stale).toBe(true);
  expect(season.meta.sourceUrl).toContain('2014%E2%80%9315_Formula_E_Championship');
  expect((await wiki.getSeason('2014-15')).data).toBe(season.data);
});

it('represents an unpublished season as source absence, while retaining real request failures', async () => {
  const get = vi.fn().mockRejectedValue(new ApiError('parse', 'Статья не найдена'));
  const wiki = createWikipedia({ get });
  expect((await wiki.getSeason('2026-27')).data).toMatchObject({
    unavailable: true,
    rounds: [],
    standings: [],
  });
  get.mockRejectedValue(new ApiError('network', 'offline'));
  await expect(wiki.getSeason('2026-27')).rejects.toThrow('offline');
});

it('rejects invalid race articles before requesting a source', async () => {
  const get = vi.fn();
  await expect(createWikipedia({ get }).getRace('Special:Search', '2025-26')).rejects.toThrow(
    'Недопустимое название статьи',
  );
  expect(get).not.toHaveBeenCalled();
});
