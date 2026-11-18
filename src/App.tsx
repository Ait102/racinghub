import { lazy, useEffect, useRef } from 'react';
import { HashRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { ErrorBox, Loading } from './components/DataState';
import { Layout } from './components/Layout';
import { ChoosePage } from './pages/ChoosePage';
import { dtm } from './series/dtm/data/seasons';
import { rememberedSeason, useSeasons } from './series/f1/hooks/data';
import { defaultFeSeason } from './series/fe/data/seasons';
import { imsa } from './series/imsa/data/seasons';
import { defaultWecSeason } from './series/wec/hooks/data';

// Each series is its own chunk: a visitor of one series does not download the other.
const f1 = () => import('./series/f1/pages');
const wec = () => import('./series/wec/pages');
const fe = () => import('./series/fe/pages');
const imsaPages = () => import('./series/imsa/pages');
const ImsaHomePage = lazy(() => imsaPages().then((m) => ({ default: m.ImsaHomePage })));
const ImsaCalendarPage = lazy(() => imsaPages().then((m) => ({ default: m.ImsaCalendarPage })));
const ImsaRacePage = lazy(() => imsaPages().then((m) => ({ default: m.ImsaRacePage })));
const ImsaStandingsPage = lazy(() => imsaPages().then((m) => ({ default: m.ImsaStandingsPage })));
const ImsaParticipantsPage = lazy(() => imsaPages().then((m) => ({ default: m.ImsaParticipantsPage })));
const ImsaProfilePage = lazy(() => imsaPages().then((m) => ({ default: m.ImsaProfilePage })));
const ImsaComparePage = lazy(() => imsaPages().then((m) => ({ default: m.ImsaComparePage })));
const ImsaSourcesPage = lazy(() => imsaPages().then((m) => ({ default: m.ImsaSourcesPage })));
const dtmPages = () => import('./series/dtm/pages');
const DtmHomePage = lazy(() => dtmPages().then((m) => ({ default: m.DtmHomePage })));
const DtmCalendarPage = lazy(() => dtmPages().then((m) => ({ default: m.DtmCalendarPage })));
const DtmRacePage = lazy(() => dtmPages().then((m) => ({ default: m.DtmRacePage })));
const DtmStandingsPage = lazy(() => dtmPages().then((m) => ({ default: m.DtmStandingsPage })));
const DtmParticipantsPage = lazy(() => dtmPages().then((m) => ({ default: m.DtmParticipantsPage })));
const DtmProfilePage = lazy(() => dtmPages().then((m) => ({ default: m.DtmProfilePage })));
const DtmComparePage = lazy(() => dtmPages().then((m) => ({ default: m.DtmComparePage })));
const DtmSourcesPage = lazy(() => dtmPages().then((m) => ({ default: m.DtmSourcesPage })));
const FeParticipantsPage = lazy(() => fe().then((m) => ({ default: m.FeParticipantsPage })));
const FeProfilePage = lazy(() => fe().then((m) => ({ default: m.FeProfilePage })));
const FeComparePage = lazy(() => fe().then((m) => ({ default: m.FeComparePage })));
const FeHomePage = lazy(() => fe().then((m) => ({ default: m.FeHomePage })));
const FeCalendarPage = lazy(() => fe().then((m) => ({ default: m.FeCalendarPage })));
const FeDriversPage = lazy(() => fe().then((m) => ({ default: m.FeDriversPage })));
const FeTeamsPage = lazy(() => fe().then((m) => ({ default: m.FeTeamsPage })));
const FeChartPage = lazy(() => fe().then((m) => ({ default: m.FeChartPage })));
const FeStandingsRedirect = lazy(() => fe().then((m) => ({ default: m.FeStandingsRedirect })));
const FeSourcesPage = lazy(() => fe().then((m) => ({ default: m.FeSourcesPage })));
const FeRacePage = lazy(() => fe().then((m) => ({ default: m.FeRacePage })));
const AboutPage = lazy(() => f1().then((m) => ({ default: m.AboutPage })));
const CalendarPage = lazy(() => f1().then((m) => ({ default: m.CalendarPage })));
const ChartPage = lazy(() => f1().then((m) => ({ default: m.ChartPage })));
const CircuitPage = lazy(() => f1().then((m) => ({ default: m.CircuitPage })));
const ComparePage = lazy(() => f1().then((m) => ({ default: m.ComparePage })));
const ConstructorPage = lazy(() => f1().then((m) => ({ default: m.ConstructorPage })));
const ConstructorsPage = lazy(() => f1().then((m) => ({ default: m.ConstructorsPage })));
const DriverPage = lazy(() => f1().then((m) => ({ default: m.DriverPage })));
const DriversPage = lazy(() => f1().then((m) => ({ default: m.DriversPage })));
const HomePage = lazy(() => f1().then((m) => ({ default: m.HomePage })));
const RacePage = lazy(() => f1().then((m) => ({ default: m.RacePage })));
const WecCalendarPage = lazy(() => wec().then((m) => ({ default: m.WecCalendarPage })));
const WecComparePage = lazy(() => wec().then((m) => ({ default: m.WecComparePage })));
const WecHomePage = lazy(() => wec().then((m) => ({ default: m.WecHomePage })));
const WecParticipantsPage = lazy(() => wec().then((m) => ({ default: m.WecParticipantsPage })));
const WecCrewsPage = lazy(() => wec().then((m) => ({ default: m.WecCrewsPage })));
const WecProfilePage = lazy(() => wec().then((m) => ({ default: m.WecProfilePage })));
const WecRacePage = lazy(() => wec().then((m) => ({ default: m.WecRacePage })));
const WecStandingsPage = lazy(() => wec().then((m) => ({ default: m.WecStandingsPage })));
const WecSourcesPage = lazy(() => wec().then((m) => ({ default: m.WecSourcesPage })));

function FeEntry() {
  return <Navigate to={`/fe/${defaultFeSeason()}`} replace />;
}

// Entry redirects are components, so the remembered season is read on every visit, not once at start.
function WecEntry() {
  return <Navigate to={`/wec/${defaultWecSeason()}`} replace />;
}

function YearSeriesEntry({ series }: { series: 'imsa' | 'dtm' }) {
  return <Navigate to={`/${series}/${(series === 'imsa' ? imsa : dtm).defaultSeason()}`} replace />;
}

/** /f1 → the remembered or latest F1 season. */
function F1Entry() {
  const seasons = useSeasons();
  if (seasons.status === 'loading') return <Loading rows={3} label="Загружаем список сезонов…" />;
  if (seasons.status === 'error') {
    const fallback = new Date().getFullYear();
    return (
      <>
        <ErrorBox error={seasons.error} onRetry={seasons.reload} />
        <p>
          Можно попробовать открыть <Link to={`/${fallback}`}>сезон {fallback}</Link> напрямую.
        </p>
      </>
    );
  }
  const remembered = rememberedSeason();
  const target =
    seasons.data.find((s) => s.year === remembered)?.year ??
    seasons.data[0]?.year ??
    new Date().getFullYear();
  return <Navigate to={`/${target}`} replace />;
}

function NotFound() {
  return (
    <section className="page">
      <h1>Страница не найдена</h1>
      <p>
        <Link to="/">Вернуться на главную</Link>
      </p>
    </section>
  );
}

/** Move focus to the main area on navigation for keyboard and screen-reader users. */
function FocusOnNavigate() {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    // Leave initial focus alone so the skip link stays the first Tab stop.
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, 0);
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <HashRouter>
      <FocusOnNavigate />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ChoosePage />} />
          <Route path="f1" element={<F1Entry />} />
          <Route path="imsa">
            <Route index element={<YearSeriesEntry series="imsa" />} />
            <Route path=":season">
              <Route index element={<ImsaHomePage />} />
              <Route path="calendar" element={<ImsaCalendarPage />} />
              <Route path="standings" element={<ImsaStandingsPage />} />
              <Route path="race/:round" element={<ImsaRacePage />} />
              <Route path="drivers" element={<ImsaParticipantsPage drivers />} />
              <Route path="teams" element={<ImsaParticipantsPage drivers={false} />} />
              <Route path="compare" element={<ImsaComparePage />} />
              <Route path="about" element={<ImsaSourcesPage />} />
              <Route path="driver/:article" element={<ImsaProfilePage kind="driver" />} />
              <Route path="team/:article" element={<ImsaProfilePage kind="team" />} />
              <Route path="circuit/:article" element={<ImsaProfilePage kind="circuit" />} />
            </Route>
          </Route>
          <Route path="dtm">
            <Route index element={<YearSeriesEntry series="dtm" />} />
            <Route path=":season">
              <Route index element={<DtmHomePage />} />
              <Route path="calendar" element={<DtmCalendarPage />} />
              <Route path="standings" element={<DtmStandingsPage />} />
              <Route path="race/:index" element={<DtmRacePage />} />
              <Route path="drivers" element={<DtmParticipantsPage drivers />} />
              <Route path="teams" element={<DtmParticipantsPage drivers={false} />} />
              <Route path="compare" element={<DtmComparePage />} />
              <Route path="about" element={<DtmSourcesPage />} />
              <Route path="driver/:article" element={<DtmProfilePage kind="driver" />} />
              <Route path="team/:article" element={<DtmProfilePage kind="team" />} />
              <Route path="circuit/:article" element={<DtmProfilePage kind="circuit" />} />
            </Route>
          </Route>
          <Route path="fe">
            <Route index element={<FeEntry />} />
            <Route path=":season">
              <Route index element={<FeHomePage />} />
              <Route path="calendar" element={<FeCalendarPage />} />
              <Route path="standings" element={<FeStandingsRedirect />} />
              <Route path="chart" element={<FeChartPage />} />
              <Route path="about" element={<FeSourcesPage />} />
              <Route path="race/:round" element={<FeRacePage />} />
              <Route path="drivers" element={<FeDriversPage />} />
              <Route path="teams" element={<FeTeamsPage />} />
              <Route path="entries" element={<FeParticipantsPage drivers />} />
              <Route path="entries/teams" element={<FeParticipantsPage drivers={false} />} />
              <Route path="compare" element={<FeComparePage />} />
              <Route path="driver/:article" element={<FeProfilePage kind="driver" />} />
              <Route path="team/:article" element={<FeProfilePage kind="team" />} />
              <Route path="eprix/:article" element={<FeProfilePage kind="eprix" />} />
            </Route>
          </Route>
          <Route path="wec">
            <Route index element={<WecEntry />} />
            <Route path=":season">
              <Route index element={<WecHomePage />} />
              <Route path="calendar" element={<WecCalendarPage />} />
              <Route path="race/:round" element={<WecRacePage />} />
              <Route path="standings" element={<WecStandingsPage />} />
              <Route path="drivers" element={<WecParticipantsPage drivers />} />
              <Route path="teams" element={<WecParticipantsPage drivers={false} />} />
              <Route path="crews" element={<WecCrewsPage />} />
              <Route path="compare" element={<WecComparePage />} />
              <Route path="about" element={<WecSourcesPage />} />
              <Route path="driver/:article" element={<WecProfilePage kind="driver" />} />
              <Route path="team/:article" element={<WecProfilePage kind="team" />} />
              <Route path="circuit/:article" element={<WecProfilePage kind="circuit" />} />
            </Route>
          </Route>
          <Route path="about" element={<AboutPage />} />
          <Route path=":season">
            <Route index element={<HomePage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="race/:round" element={<RacePage />} />
            <Route path="drivers" element={<DriversPage />} />
            <Route path="constructors" element={<ConstructorsPage />} />
            <Route path="chart" element={<ChartPage />} />
            <Route path="compare" element={<ComparePage />} />
            <Route path="driver/:driverId" element={<DriverPage />} />
            <Route path="constructor/:constructorId" element={<ConstructorPage />} />
            <Route path="circuit/:circuitId" element={<CircuitPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
