import { lazy, useEffect, useRef } from 'react';
import { HashRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { ErrorBox, Loading } from './components/DataState';
import { Layout } from './components/Layout';
import { ChoosePage } from './pages/ChoosePage';
import { rememberedSeason, useSeasons } from './series/f1/hooks/data';
import { defaultWecSeason } from './series/wec/hooks/data';

// Each series is its own chunk: a visitor of one series does not download the other.
const f1 = () => import('./series/f1/pages');
const wec = () => import('./series/wec/pages');
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
const WecProfilePage = lazy(() => wec().then((m) => ({ default: m.WecProfilePage })));
const WecRacePage = lazy(() => wec().then((m) => ({ default: m.WecRacePage })));
const WecStandingsPage = lazy(() => wec().then((m) => ({ default: m.WecStandingsPage })));

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
          <Route path="wec">
            <Route index element={<Navigate to={`/wec/${defaultWecSeason()}`} replace />} />
            <Route path=":season">
              <Route index element={<WecHomePage />} />
              <Route path="calendar" element={<WecCalendarPage />} />
              <Route path="race/:round" element={<WecRacePage />} />
              <Route path="standings" element={<WecStandingsPage />} />
              <Route path="drivers" element={<WecParticipantsPage drivers />} />
              <Route path="teams" element={<WecParticipantsPage drivers={false} />} />
              <Route path="compare" element={<WecComparePage />} />
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
