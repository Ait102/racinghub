import { Suspense, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { localTimeZone, utcOffsetLabel } from '../lib/format';
import { dtm } from '../series/dtm/data/seasons';
import { rememberedSeason, rememberSeason, useSeasonParam, useSeasons } from '../series/f1/hooks/data';
import { FeSeasonSelect } from '../series/fe/components/FeSeasonSelect';
import { defaultFeSeason, feSeasonFromPath } from '../series/fe/data/seasons';
import { imsa } from '../series/imsa/data/seasons';
import { WecSeasonSelect } from '../series/wec/components/WecSeasonSelect';
import { defaultWecSeason, wecSeasonFromPath } from '../series/wec/hooks/data';
import { Loading } from './DataState';
import { YearSeasonSelect } from './YearSeasonSelect';

function SeasonSelect({ season }: { season: number | null }) {
  const seasons = useSeasons();
  const navigate = useNavigate();
  const location = useLocation();

  function onChange(next: string) {
    // Keep the same section (and profile); a race page jumps to the new season's calendar.
    const rest = location.pathname.split('/').slice(2);
    const section = rest[0] === 'race' ? 'calendar' : rest.join('/');
    navigate(`/${next}${section ? '/' + section : ''}`);
  }

  if (seasons.status === 'error') {
    return (
      <button type="button" className="btn btn--small" onClick={seasons.reload}>
        Сезоны не загружены — повторить
      </button>
    );
  }

  const list = seasons.status === 'success' ? seasons.data : season ? [{ year: season, label: '' }] : [];
  return (
    <label className="season-select">
      <span className="season-select__label">Сезон</span>
      <select
        value={season ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={seasons.status === 'loading'}
        aria-busy={seasons.status === 'loading'}
      >
        {season === null && <option value="">—</option>}
        {list.map((s) => (
          <option key={s.year} value={s.year}>
            {s.year}
          </option>
        ))}
      </select>
    </label>
  );
}

type Series = 'f1' | 'wec' | 'fe' | 'imsa' | 'dtm' | null;

function seriesOf(pathname: string): Series {
  if (pathname === '/') return null;
  if (pathname === '/fe' || pathname.startsWith('/fe/')) return 'fe';
  if (pathname === '/wec' || pathname.startsWith('/wec/')) return 'wec';
  if (pathname === '/imsa' || pathname.startsWith('/imsa/')) return 'imsa';
  if (pathname === '/dtm' || pathname.startsWith('/dtm/')) return 'dtm';
  return 'f1';
}

function SeriesSwitch({ series, f1Home }: { series: Series; f1Home: string }) {
  const items: Array<[Exclude<Series, null>, string, string]> = [
    ['f1', 'F1', f1Home],
    ['wec', 'WEC', '/wec'],
    ['fe', 'FE', '/fe'],
    ['imsa', 'IMSA', '/imsa'],
    ['dtm', 'DTM', '/dtm'],
  ];
  return (
    <nav className="series-switch" aria-label="Чемпионат">
      {items.map(([id, label, to]) => (
        <Link
          key={id}
          to={to}
          className={`series-switch__item${series === id ? ' is-active' : ''}`}
          aria-current={series === id ? 'page' : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function Layout() {
  const season = useSeasonParam();
  const navSeason = season ?? rememberedSeason();
  const { pathname } = useLocation();
  const series = seriesOf(pathname);

  useEffect(() => {
    if (season !== null) rememberSeason(season);
  }, [season]);

  // Each series sets its accent through the theme stylesheet.
  useEffect(() => {
    document.documentElement.dataset.series = series ?? 'none';
  }, [series]);

  const wecSeason = wecSeasonFromPath(pathname) ?? (series === 'wec' ? defaultWecSeason() : null);
  const feSeason = feSeasonFromPath(pathname) ?? (series === 'fe' ? defaultFeSeason() : null);
  const tz = localTimeZone();
  const links: Array<[string, string]> =
    series === 'f1' && navSeason
      ? [
          [`/${navSeason}`, 'Главная'],
          [`/${navSeason}/calendar`, 'Календарь'],
          [`/${navSeason}/drivers`, 'Пилоты'],
          [`/${navSeason}/constructors`, 'Конструкторы'],
          [`/${navSeason}/chart`, 'График'],
          ['/about', 'Источники'],
        ]
      : series === 'f1'
        ? [['/about', 'Источники']]
        : series === 'wec' && wecSeason
          ? [
              [`/wec/${wecSeason}`, 'Главная'],
              [`/wec/${wecSeason}/calendar`, 'Календарь'],
              [`/wec/${wecSeason}/standings`, 'Зачёты'],
              [`/wec/${wecSeason}/drivers`, 'Пилоты'],
              [`/wec/${wecSeason}/teams`, 'Команды'],
              [`/wec/${wecSeason}/crews`, 'Экипажи'],
              [`/wec/${wecSeason}/compare`, 'Сравнение'],
              [`/wec/${wecSeason}/about`, 'Источники'],
            ]
          : series === 'fe' && feSeason
            ? [
                [`/fe/${feSeason}`, 'Главная'],
                [`/fe/${feSeason}/calendar`, 'Календарь'],
                [`/fe/${feSeason}/standings`, 'Зачёты'],
                [`/fe/${feSeason}/drivers`, 'Пилоты'],
                [`/fe/${feSeason}/teams`, 'Команды'],
                [`/fe/${feSeason}/compare`, 'Сравнение'],
                [`/fe/${feSeason}/about`, 'Источники'],
              ]
            : [];

  return (
    <div className="app">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          // A plain #main would be treated as a route by HashRouter.
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Перейти к содержимому
      </a>
      <header className="header">
        <div className="container header__inner">
          <Link to="/" className="logo" aria-label="Racing Hub — выбор чемпионата">
            <span className="logo__mark" aria-hidden="true">
              RH
            </span>
            <span className="logo__text">Racing Hub</span>
          </Link>
          <nav className="nav" aria-label="Основная навигация">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to} end className="nav__link">
                {label}
              </NavLink>
            ))}
          </nav>
          <SeriesSwitch series={series} f1Home={navSeason ? `/${navSeason}` : '/f1'} />
          {series === 'f1' && <SeasonSelect season={season} />}
          {series === 'wec' && <WecSeasonSelect />}
          {series === 'fe' && <FeSeasonSelect />}
          {series === 'imsa' && (
            <YearSeasonSelect series="imsa" seasons={imsa.seasons()} current={imsa.fromPath(pathname)} />
          )}
          {series === 'dtm' && (
            <YearSeasonSelect series="dtm" seasons={dtm.seasons()} current={dtm.fromPath(pathname)} />
          )}
        </div>
      </header>
      <main id="main" className="container main" tabIndex={-1}>
        <Suspense fallback={<Loading rows={3} label="Загружаем раздел…" />}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="footer">
        <div className="container footer__inner">
          <p>
            Данные:{' '}
            {series === 'wec' || series === 'fe' || series === 'imsa' || series === 'dtm' ? (
              <>
                <a
                  href={
                    series === 'fe'
                      ? 'https://en.wikipedia.org/wiki/Formula_E'
                      : series === 'imsa'
                        ? 'https://en.wikipedia.org/wiki/IMSA_SportsCar_Championship'
                        : series === 'dtm'
                          ? 'https://en.wikipedia.org/wiki/Deutsche_Tourenwagen_Masters'
                          : 'https://en.wikipedia.org/wiki/FIA_World_Endurance_Championship'
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Википедия
                </a>
                , лицензия{' '}
                <a
                  href="https://creativecommons.org/licenses/by-sa/4.0/deed.ru"
                  target="_blank"
                  rel="noreferrer"
                >
                  CC BY-SA 4.0
                </a>
              </>
            ) : (
              <>
                <a href="https://github.com/jolpica/jolpica-f1" target="_blank" rel="noreferrer">
                  Jolpica-F1
                </a>{' '}
                (открытый API, совместимый с Ergast), лицензия{' '}
                <a
                  href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ru"
                  target="_blank"
                  rel="noreferrer"
                >
                  CC BY-NC-SA 4.0
                </a>
              </>
            )}
            . Некоммерческий неофициальный проект, не связан с Formula 1, FIA, WEC, Formula E, IMSA и DTM.
          </p>
          <p>
            Время показано в зоне <strong>{tz}</strong> ({utcOffsetLabel(tz)}). Наведите на время, чтобы
            увидеть UTC.
          </p>
        </div>
      </footer>
    </div>
  );
}
