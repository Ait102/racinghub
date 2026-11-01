import { Fragment } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { getArticlePhoto } from '../../../api/wikimedia';
import { DataState } from '../../../components/DataState';
import { FavToggle } from '../../../components/FavButton';
import { PageHeader } from '../../../components/PageHeader';
import { PhotoFigure, usePhoto } from '../../../components/PhotoFigure';
import { SortableTable, type Column } from '../../../components/SortableTable';
import { Stat } from '../../../components/ui';
import { articleUrl } from '../api/wikipedia';
import { NameFlag, WecEmblem, WikiSourceNote } from '../components/bits';
import { seasonLabel } from '../data/seasons';
import {
  profileStats,
  validArticle,
  type ProfileCell,
  type ProfileKind,
  type ProfileRow,
  type ProfileTable,
} from '../domain/profiles';
import type { Named } from '../domain/types';
import { useWecParticipants, useWecProfile, useWecSeason } from '../hooks/data';
import { useWecFavorites, type WecFavKind } from '../hooks/favorites';
import { WecGuard } from './common';

export function WecProfilePage({ kind }: { kind: ProfileKind }) {
  const { article = '' } = useParams();
  return (
    <WecGuard>
      {(season) =>
        validArticle(article) ? (
          <Profile key={`${kind}:${article}`} season={season} article={article} kind={kind} />
        ) : (
          <section className="page">
            <h1>Недопустимый адрес профиля</h1>
            <Link to={`/wec/${season}`}>Обзор WEC</Link>
          </section>
        )
      }
    </WecGuard>
  );
}

function ProfilePhoto({ article, kind }: { article: string; kind: ProfileKind }) {
  const state = usePhoto(`wec:${article}`, () =>
    getArticlePhoto(article, { width: kind === 'driver' ? 480 : 900, photosOnly: true }),
  );
  return <PhotoFigure state={state} alt={article} shape={kind === 'driver' ? 'portrait' : 'wide'} />;
}

function Profile({ season, article, kind }: { season: string; article: string; kind: ProfileKind }) {
  const res = useWecProfile(article, kind);
  const [params] = useSearchParams();
  const circuit = params.get('circuit');
  const photoArticle = kind === 'circuit' && circuit && validArticle(circuit) ? circuit : article;
  const canonical = res.status === 'success' ? res.data.article : article;
  if (res.status === 'error' && res.error instanceof Error && res.error.message === 'Статья не найдена') {
    return (
      <section className="page">
        <h1>Профиль не найден</h1>
        <p role="alert">Статья не найдена в Википедии.</p>
        <Link to={`/wec/${season}`}>Обзор WEC</Link>
      </section>
    );
  }
  return (
    <section className="page">
      <nav className="crumbs" aria-label="Навигация">
        <Link to={`/wec/${season}/${kind === 'driver' ? 'drivers' : kind === 'team' ? 'teams' : 'calendar'}`}>
          ← {kind === 'driver' ? 'Пилоты' : kind === 'team' ? 'Команды' : 'Календарь'} {seasonLabel(season)}
        </Link>
      </nav>
      <PageHeader
        eyebrow={`WEC ${seasonLabel(season)} · ${kind === 'driver' ? 'Пилот' : kind === 'team' ? 'Команда / производитель' : 'Трасса и гонка'}`}
        title={canonical.replace(/_/g, ' ')}
        aside={<ProfilePhoto article={photoArticle} kind={kind} />}
      >
        {kind === 'team' && <WecEmblem name={canonical} size="lg" />}
        {kind !== 'circuit' && (
          <div className="profile-actions">
            <ProfileFav
              kind={kind === 'driver' ? 'drivers' : 'teams'}
              article={article}
              canonical={canonical}
            />
            {kind === 'driver' && (
              <Link
                className="btn btn--ghost btn--small"
                to={`/wec/${season}/compare?${new URLSearchParams({ a: canonical })}`}
              >
                Сравнить с другим пилотом
              </Link>
            )}
          </div>
        )}
      </PageHeader>
      {kind !== 'circuit' && (
        <SeasonProfile season={season} article={article} canonical={canonical} kind={kind} />
      )}
      {kind === 'team' && <TeamCars season={season} article={article} canonical={canonical} />}
      <div className="wec-profile-history">
        <DataState state={res}>
          {(data) => {
            const stats = profileStats(data);
            return (
              <>
                {kind === 'driver' && data.tables.some((t) => t.kind === 'wec') && (
                  <>
                    <div className="stats">
                      <Stat label="Сезонов WEC в статье" value={stats.seasons} />
                      <Stat label="Титулов завершённых сезонов" value={stats.titles} />
                      <Stat label="Побед в классе Ле-Мана" value={stats.leMansWins} />
                      <Stat label="Подиумов в классе Ле-Мана" value={stats.leMansPodiums} />
                    </div>
                    <p className="muted small">
                      Победы и подиумы в классе считаются по колонке Class Pos. Ле-Мана. Таблица WEC не всегда
                      отделяет места в классе от общих мест, поэтому статистику побед WEC по ней не выводим.
                      Текущий сезон не учитывается в титулах.
                    </p>
                  </>
                )}
                {kind === 'circuit' && (
                  <p className="muted">
                    История из статьи о гонке. Если источник публикует только общих победителей, деление по
                    классам не добавляется.
                  </p>
                )}
                {data.tables.length === 0 && data.standings.length === 0 && (
                  <p className="state state--empty">В статье нет таблиц результатов WEC.</p>
                )}
                {kind === 'team' && (
                  <p className="muted small">
                    История ограничена таблицами этой статьи. Строки разных машин сохранены; очки между ними
                    не складываются.
                  </p>
                )}
                {data.tables.map((table, i) => (
                  <HistoryTable key={i} table={table} season={season} />
                ))}
                {data.standings.map((table) => (
                  <Fragment key={table.id}>
                    <h2 className="section-title">{table.title}</h2>
                    <SortableTable
                      caption={table.title}
                      rows={table.rows}
                      rowKey={(row) => row.name.name + row.extra}
                      columns={[
                        {
                          key: 'name',
                          header: table.nameHeader,
                          render: (row) => <NameFlag who={row.name} />,
                        },
                        { key: 'pos', header: 'Место', render: (row) => row.posText },
                        { key: 'points', header: 'Очки', render: (row) => row.points },
                      ]}
                    />
                  </Fragment>
                ))}
              </>
            );
          }}
        </DataState>
      </div>
      <WikiSourceNote />
    </section>
  );
}

/** Stores the article from the address, so lists that link the same title highlight it. */
function ProfileFav({ kind, article, canonical }: { kind: WecFavKind; article: string; canonical: string }) {
  const { isFav, toggle } = useWecFavorites();
  const saved = [article, canonical].find((a) => isFav(kind, a));
  return (
    <FavToggle on={saved !== undefined} name={canonical} onToggle={() => toggle(kind, saved ?? article)} />
  );
}

/** Cars of the team in the season's entry list, with the photo from each car's article. */
function TeamCars({ season, article, canonical }: { season: string; article: string; canonical: string }) {
  const entries = useWecParticipants(season, false);
  if (entries.status !== 'success') return null;
  const cars = entries.data.find((p) => p.who.article === article || p.who.article === canonical)?.cars ?? [];
  if (cars.length === 0) return null;
  return (
    <div className="wec-cars">
      <h2 className="section-title">Машины сезона {seasonLabel(season)}</h2>
      <p className="muted small">
        Модели из заявки сезона. Фото — из статьи о модели и может показывать машину другой команды.
      </p>
      <div className="wec-cars__grid">
        {cars.map((car) => (
          <CarPhoto key={car.name} car={car} />
        ))}
      </div>
    </div>
  );
}

function CarPhoto({ car }: { car: Named }) {
  const valid = car.article !== null && validArticle(car.article);
  const state = usePhoto(valid ? `wec:car:${car.article}` : null, () =>
    getArticlePhoto(car.article!, { width: 900, photosOnly: true }),
  );
  return (
    <div className="wec-cars__item">
      <PhotoFigure state={state} alt={car.name} caption={car.name} shape="wide" />
      {state.status === 'done' && !state.photo && <p className="muted">{car.name} — фото нет у источника</p>}
    </div>
  );
}

function SeasonProfile({
  season,
  article,
  canonical,
  kind,
}: {
  season: string;
  article: string;
  canonical: string;
  kind: ProfileKind;
}) {
  const res = useWecSeason(season);
  const needsEntry =
    res.status === 'success' &&
    !res.data.standings.some(
      (table) =>
        (table.kind === 'drivers') === (kind === 'driver') &&
        table.rows.some(
          (row) => (row.name.article === article || row.name.article === canonical) && row.name.flag,
        ),
    );
  const entries = useWecParticipants(needsEntry ? season : null, kind === 'driver');
  return (
    <div className="wec-profile-season">
      <h2 className="section-title">Сезон {seasonLabel(season)}</h2>
      {needsEntry && (
        <div className="wec-profile-entry">
          <DataState state={entries}>
            {(participants) => {
              const entry = participants.find(
                (p) => p.who.article === article || p.who.article === canonical,
              );
              return entry ? (
                <p>
                  <NameFlag who={entry.who} kind={kind} link={false} /> · {entry.categories.join(', ')}
                </p>
              ) : (
                <p className="muted">Участник не найден в заявке выбранного сезона.</p>
              );
            }}
          </DataState>
        </div>
      )}
      <DataState state={res}>
        {(data) => {
          const rows = data.standings.flatMap((table) =>
            (table.kind === 'drivers') !== (kind === 'driver')
              ? []
              : table.rows
                  .filter((row) => row.name.article === article || row.name.article === canonical)
                  .map((row) => ({ ...row, table })),
          );
          return rows.length ? (
            <>
              <NameFlag who={rows[0].name} kind={kind} link={false} />
              <SortableTable
                caption={`Зачёты ${seasonLabel(season)}`}
                rows={rows}
                rowKey={(row) => row.table.id + row.extra + row.name.name}
                columns={[
                  {
                    key: 'table',
                    header: 'Зачёт',
                    render: (row) => (
                      <Link to={`/wec/${season}/standings?t=${row.table.id}`}>{row.table.title}</Link>
                    ),
                  },
                  { key: 'extra', header: 'Команда / машина', render: (row) => row.extra ?? '—' },
                  { key: 'pos', header: 'Место', render: (row) => row.posText },
                  { key: 'points', header: 'Очки', render: (row) => row.points || '—' },
                ]}
              />
            </>
          ) : (
            <p className="muted">В опубликованных зачётах этого сезона участник не найден.</p>
          );
        }}
      </DataState>
    </div>
  );
}

const HEADERS: Record<string, string> = {
  Year: 'Сезон',
  Season: 'Сезон',
  Entrant: 'Команда',
  Team: 'Команда',
  Class: 'Класс',
  Car: 'Машина',
  Chassis: 'Шасси',
  Engine: 'Двигатель',
  Drivers: 'Пилоты',
  Driver: 'Пилот',
  'Co-Drivers': 'Напарники',
  Laps: 'Круги',
  Rank: 'Место',
  'Pos.': 'Место',
  Pos: 'Место',
  Points: 'Очки',
  'Pts.': 'Очки',
  'ClassPos.': 'В классе',
  'Class Pos.': 'В классе',
  Time: 'Время',
  Distance: 'Дистанция',
  Championship: 'Чемпионат',
};

function HistoryTable({ table, season }: { table: ProfileTable; season: string }) {
  const title =
    table.kind === 'wec'
      ? 'Результаты WEC'
      : table.kind === 'lemans'
        ? '24 часа Ле-Мана'
        : 'Победители по годам';
  const columns: Column<ProfileRow>[] = table.columns.map((name, i) => ({
    key: String(i),
    header: HEADERS[name] ?? name,
    render: (row) => <Cell cell={row.cells[i]} header={name} season={season} />,
    ...(i === 0 ? { sortValue: (row: ProfileRow) => row.season } : {}),
  }));
  return (
    <>
      <h2 className="section-title">{title}</h2>
      <SortableTable
        columns={columns}
        rows={table.rows}
        rowKey={(row) => String(table.rows.indexOf(row))}
        caption={table.title}
        rowClassName={(row) => (row.season === season ? 'wec-profile-current' : undefined)}
      />
    </>
  );
}

/** Preserve the complete source text, making only named links interactive. */
function Cell({ cell, header, season }: { cell: ProfileCell; header: string; season: string }) {
  const target: ProfileKind | null = /^(Team|Entrant)$/i.test(header)
    ? 'team'
    : /^(Co-Drivers|Drivers?)$/i.test(header)
      ? 'driver'
      : null;
  let cursor = 0;
  const pieces = [];
  for (const link of cell.links) {
    const at = cell.text.indexOf(link.name, cursor);
    if (at < 0 || !link.name) continue;
    pieces.push(<Fragment key={`${at}:text`}>{cell.text.slice(cursor, at)}</Fragment>);
    const href =
      target && link.article && validArticle(link.article)
        ? `/wec/${season}/${target}/${encodeURIComponent(link.article)}`
        : null;
    pieces.push(
      href ? (
        <Link key={at} to={href}>
          {link.name}
        </Link>
      ) : (
        <a key={at} href={articleUrl(link.article!)} target="_blank" rel="noreferrer">
          {link.name}
        </a>
      ),
    );
    cursor = at + link.name.length;
  }
  pieces.push(<Fragment key="tail">{cell.text.slice(cursor) || (cell.text ? '' : '—')}</Fragment>);
  return <span className={cell.tone ? `res res--${cell.tone}` : undefined}>{pieces}</span>;
}
