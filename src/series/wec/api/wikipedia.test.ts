import { createClient } from '../../../api/client';
import buemi from '../__fixtures__/driver-buemi.html?raw';
import { createWikipedia } from './wikipedia';

it('loads a profile in one request, uses bounded cache and follows the canonical title', async () => {
  let now = Date.now();
  const fetcher = vi
    .fn()
    .mockImplementation(
      async () => new Response(JSON.stringify({ parse: { title: 'Sébastien Buemi', text: buemi } })),
    );
  const client = createClient({
    baseUrl: 'https://en.wikipedia.org/w/api.php',
    provider: 'wiki',
    storage: null,
    fetchFn: fetcher,
    validate: () => null,
    now: () => now,
  });
  const wiki = createWikipedia(client);
  const res = await wiki.getProfile('Sebastien Buemi', 'driver');
  expect(res.data.article).toBe('Sébastien Buemi');
  expect(res.data.tables).toHaveLength(2);
  expect(res.meta.sourceUrl).toContain('S%C3%A9bastien_Buemi');
  await wiki.getProfile('Sebastien Buemi', 'driver');
  expect(fetcher).toHaveBeenCalledTimes(1);
  now += 11 * 60_000;
  await wiki.getProfile('Sebastien Buemi', 'driver', { immutable: true });
  expect(fetcher).toHaveBeenCalledTimes(2);
}, 20_000);

it('rejects invalid article titles before making a request', async () => {
  const fetcher = vi.fn();
  const client = createClient({
    baseUrl: 'https://en.wikipedia.org/w/api.php',
    provider: 'wiki',
    storage: null,
    fetchFn: fetcher,
  });
  await expect(createWikipedia(client).getProfile('Special:Search', 'driver')).rejects.toThrow(
    'Недопустимое название статьи',
  );
  expect(fetcher).not.toHaveBeenCalled();
});
