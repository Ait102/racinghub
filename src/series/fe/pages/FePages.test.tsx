import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import type { StandingTable } from '../../../lib/wikiStandings';
import london from '../__fixtures__/race-2026-london.html?raw';
import { parseRace, type FeRaceData } from '../domain/race';
import type { FeRound, FeSeasonData } from '../domain/types';
import { useFeRace, useFeSeason } from '../hooks/data';
import { FeCalendarPage } from './FeCalendarPage';
import { FeHomePage } from './FeHomePage';
import { FeStandingsPage } from './FeStandingsPage';

vi.mock('../hooks/data', () => ({
  useFeRace: vi.fn(),
  useFeSeason: vi.fn(),
  // Emblems read the entry list; these page tests do not need it.
  useFeTeamPowertrains: () => new Map(),
}));

const named = (name: string) => ({ name, article: name, flag: null });
const meta = {
  provider: 'Википедия',
  sourceUrl: 'https://en.wikipedia.org/wiki/Season',
  fetchedAt: '2026-01-01T00:00:00Z',
  stale: false,
};
const success = <T,>(data: T, source = meta.sourceUrl) => ({
  status: 'success' as const,
  data,
  meta: { ...meta, sourceUrl: source },
  reload: vi.fn(),
});
const round = (number: number, raceNumber: number | null = null): FeRound => ({
  round: number,
  name: 'Test ePrix',
  circuit: named('Test Circuit'),
  country: null,
  dateText: '1 January 2026',
  start: '2026-01-01',
  end: '2026-01-01',
  report: 'Double ePrix',
  winner: null,
  winningTeam: null,
  pole: null,
  fastestLap: null,
  raceNumber,
});
const teams: StandingTable = {
  id: 'teams',
  title: "Teams' Championship",
  kind: 'teams',
  nameHeader: 'Team',
  extraHeader: 'No.',
  rounds: [
    { abbr: 'TST', report: 'Double ePrix' },
    { abbr: 'TST', report: 'Double ePrix' },
  ],
  rows: [
    {
      pos: 1,
      posText: '1',
      name: named('Test Team'),
      extra: '11',
      lineLabels: ['11', '12'],
      lines: [
        [
          { text: '1', tone: 'gold' },
          { text: 'Ret', tone: 'retired' },
        ],
        [
          { text: '2', tone: 'silver' },
          { text: '4', tone: 'points' },
        ],
      ],
      points: '37.5',
      pointsValue: 37.5,
    },
  ],
};
const season: FeSeasonData = {
  id: '2025-26',
  article: 'Season',
  rounds: [round(1, 1), round(2, 2)],
  standings: [teams],
};

function show(page: 'home' | 'calendar' | 'standings') {
  const component =
    page === 'home' ? <FeHomePage /> : page === 'calendar' ? <FeCalendarPage /> : <FeStandingsPage />;
  return render(
    <MemoryRouter initialEntries={[`/fe/2025-26/${page}`]}>
      <Routes>
        <Route path="/fe/:season/:page" element={component} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(useFeSeason).mockReturnValue(success(season));
  vi.mocked(useFeRace).mockReturnValue(
    success({ article: 'Double ePrix', title: 'Double ePrix', description: null, circuit: null, races: [] }),
  );
});

it('keeps both cars, source points, separate double-header links and isolated favorites', () => {
  show('standings');
  const table = screen.getByRole('table', { name: "Teams' Championship" });
  expect(within(table).getAllByRole('row')).toHaveLength(3);
  expect(within(table).getByText('37.5').closest('td')).toHaveAttribute('rowspan', '2');
  expect(
    within(table)
      .getAllByRole('link', { name: 'TST' })
      .map((link) => link.getAttribute('href')),
  ).toEqual(['/fe/2025-26/race/1', '/fe/2025-26/race/2']);
  expect(within(table).getByText('Ret')).toHaveClass('fe-result--retired');
  expect(within(table).getByText('12')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Добавить Test Team в избранное' }));
  expect(localStorage.getItem('racinghub:fe:favorites')).toContain('Test Team');
  expect(localStorage.getItem('racinghub:wec:favorites')).toBeNull();
  expect(screen.getByRole('img', { name: /График мест/ })).toHaveClass('chart__svg');
});

it('does not mark a past date completed until the source publishes a winner', () => {
  vi.mocked(useFeSeason).mockReturnValue(
    success({ ...season, rounds: [{ ...round(1, 1), winner: named('Winner') }, round(2, 2)] }),
  );
  show('calendar');
  expect(screen.getAllByText('Завершён')).toHaveLength(2);
  expect(screen.getAllByText('Ждём результаты')).toHaveLength(2);
  expect(screen.getByText('Сдвоенный этап · гонка 2')).toBeInTheDocument();
  expect(screen.getByText('Winner')).toBeInTheDocument();
});

it('shows the matching Race 2 podium with its own source and never falls back to Race 1', () => {
  vi.mocked(useFeSeason).mockReturnValue(
    success({ ...season, rounds: [{ ...round(2, 2), winner: named('Second Race Winner') }] }),
  );
  const entry = (name: string) => ({
    pos: 1,
    posText: '1',
    number: '1',
    driver: named(name),
    team: named('Team'),
    laps: '30',
    time: '1:00:00',
    grid: '1',
    points: '25',
  });
  const race: FeRaceData = {
    article: 'Double ePrix',
    title: 'Double ePrix',
    description: null,
    circuit: null,
    races: [
      { raceNumber: 1, title: 'Race 1', classification: [entry('Wrong Winner')], qualifying: [] },
      { raceNumber: 2, title: 'Race 2', classification: [entry('Second Race Winner')], qualifying: [] },
    ],
  };
  vi.mocked(useFeRace).mockReturnValue(success(race, 'https://en.wikipedia.org/wiki/Double_ePrix'));
  const { rerender } = show('home');
  expect(screen.queryByText('Wrong Winner')).not.toBeInTheDocument();
  expect(screen.getAllByText('Second Race Winner')).toHaveLength(2);
  expect(screen.getAllByRole('link', { name: 'Википедия' }).map((link) => link.getAttribute('href'))).toEqual(
    ['https://en.wikipedia.org/wiki/Double_ePrix', meta.sourceUrl],
  );
  vi.mocked(useFeRace).mockReturnValue(success({ ...race, races: race.races.slice(0, 1) }));
  rerender(
    <MemoryRouter initialEntries={['/fe/2025-26/home']}>
      <Routes>
        <Route path="/fe/:season/:page" element={<FeHomePage />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText('Подиума у источника пока нет.')).toBeInTheDocument();
  expect(screen.queryByText('Wrong Winner')).not.toBeInTheDocument();
});

it('explains a missing future article without calling it a load error', () => {
  vi.mocked(useFeSeason).mockReturnValue(
    success({ ...season, unavailable: true, rounds: [], standings: [] }),
  );
  show('home');
  expect(screen.getByText('Статья сезона ещё не опубликована в Википедии.')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

const londonRace = parseRace('2026 London ePrix', london);

it('shows the genuine London Race 2 infobox podium when its full protocol is unpublished', () => {
  const race = londonRace;
  vi.mocked(useFeSeason).mockReturnValue(
    success({
      ...season,
      rounds: [{ ...round(17, 2), report: race.article, winner: named('Taylor Barnard') }],
    }),
  );
  vi.mocked(useFeRace).mockReturnValue(success(race));
  show('home');
  const podium = within(screen.getByRole('heading', { name: 'Подиум' }).parentElement!).getByRole('list');
  const rows = within(podium).getAllByRole('listitem');
  expect(rows).toHaveLength(3);
  expect(rows[0]).toHaveTextContent('1Taylor BarnardDS Penske');
  expect(rows[1]).toHaveTextContent('2Nyck de VriesMahindra');
  expect(rows[2]).toHaveTextContent('3Edoardo MortaraMahindra');
  expect(screen.queryByText('Подиума у источника пока нет.')).not.toBeInTheDocument();
  expect(race.races[1].classification).toEqual([]);
});
