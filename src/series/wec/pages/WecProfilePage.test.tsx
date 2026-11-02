import { act, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { parseProfile } from '../domain/profiles';
import { useWecParticipants, useWecProfile, useWecSeason } from '../hooks/data';
import { WecProfilePage } from './WecProfilePage';

vi.mock('../hooks/data', async (load) => ({
  ...(await load<Record<string, unknown>>()),
  useWecProfile: vi.fn(),
  useWecParticipants: vi.fn(),
  useWecSeason: vi.fn(),
}));

const meta = {
  provider: 'Википедия',
  sourceUrl: 'https://en.wikipedia.org/wiki/Driver',
  fetchedAt: '2026-11-02T00:00:00Z',
  stale: false,
};
const success = <T,>(data: T) => ({ status: 'success' as const, data, meta, reload: vi.fn() });

beforeEach(() => {
  vi.mocked(useWecSeason).mockReturnValue(
    success({ id: '2024', article: 'Season', rounds: [], cancelled: [], classes: [], standings: [] }),
  );
  vi.mocked(useWecParticipants).mockReturnValue(success([]));
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ query: { pages: [] } }))),
  );
});

afterEach(() => vi.unstubAllGlobals());

function show(kind: 'driver' | 'team', article: string) {
  return render(
    <MemoryRouter initialEntries={[`/wec/2024/${kind}/${article}`]}>
      <Routes>
        <Route path="/wec/:season/:kind/:article" element={<WecProfilePage kind={kind} />} />
      </Routes>
    </MemoryRouter>,
  );
}

it('shows sourced personal facts and plain biography on the driver profile', async () => {
  vi.mocked(useWecProfile).mockReturnValue(
    success(
      parseProfile(
        'Driver',
        '<table class="infobox"><tr><th>Nationality</th><td>Swiss</td></tr></table><p>Driver is a Swiss racing driver who competes in the FIA World Endurance Championship.</p>',
        'driver',
      ),
    ),
  );
  await act(async () => {
    show('driver', 'Driver');
  });
  expect(screen.getByRole('heading', { name: 'О пилоте' })).toBeInTheDocument();
  expect(screen.getByText('Национальность')).toBeInTheDocument();
  expect(screen.getByText('Swiss')).toBeInTheDocument();
  expect(screen.getByText(/Driver is a Swiss racing driver/)).toBeInTheDocument();
  expect(
    screen
      .getAllByRole('link', { name: 'Википедия' })
      .some((link) => link.getAttribute('href') === meta.sourceUrl),
  ).toBe(true);
});

it('renders every model for team aliases and keeps the entry-list source', async () => {
  vi.mocked(useWecProfile).mockReturnValue(success(parseProfile('Canonical Team', '', 'team')));
  const named = (name: string) => ({ name, article: name, flag: null });
  vi.mocked(useWecParticipants).mockReturnValue(
    success([
      { who: named('Old Team'), categories: ['Hypercar'], cars: [named('Model A')] },
      { who: named('Canonical Team'), categories: ['LMGT3'], cars: [named('Model B')] },
    ]),
  );
  await act(async () => {
    show('team', 'Old Team');
  });
  expect(screen.getByRole('heading', { name: 'Model A' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Model B' })).toBeInTheDocument();
  const gallery = screen.getByRole('region', { name: 'Машины сезона 2024' });
  expect(within(gallery).getByRole('link', { name: 'Википедия' })).toHaveAttribute('href', meta.sourceUrl);
  expect(gallery.querySelector('time')).toHaveAttribute('datetime', meta.fetchedAt);
});
