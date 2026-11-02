import { Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getArticlePhoto } from '../../../api/wikimedia';
import { articleUrl } from '../../../api/wikipedia';
import { DataState } from '../../../components/DataState';
import { FavToggle } from '../../../components/FavButton';
import { PageHeader } from '../../../components/PageHeader';
import { PhotoFigure, usePhoto } from '../../../components/PhotoFigure';
import { SortableTable, type Column } from '../../../components/SortableTable';
import { Stat } from '../../../components/ui';
import { validArticle } from '../../../lib/wikiArticle';
import type { Fact, ProfileCell, ProfileRow } from '../../../lib/wikiProfile';
import { NameFlag, WikiSourceNote } from '../components/bits';
import { seasonLabel } from '../data/seasons';
import { summaryColumns, summaryRows, type FeProfileKind, type FeProfileTable } from '../domain/profiles';
import { useFeProfile, useFeSeason } from '../hooks/data';
import { useFeFavorites } from '../hooks/favorites';
import { FeGuard } from './common';

const KIND_LABEL: Record<FeProfileKind, string> = { driver: 'Пилот', team: 'Команда', eprix: 'E-Prix' };
const BACK: Record<FeProfileKind, [string, string]> = {
  driver: ['drivers', 'Пилоты'],
  team: ['teams', 'Команды'],
  eprix: ['calendar', 'Календарь'],
};
/** Infobox figures shown as tiles; the rest of the facts go to the list. */
const TILES: Record<FeProfileKind, string[]> = {
  driver: ['Старты', 'Победы', 'Подиумы', 'Поулы', 'Титулы'],
  team: ['Гонки', 'Победы', 'Подиумы', 'Поулы', 'Командные титулы'],
  eprix: ['Проводилась', 'Впервые', 'Длина круга'],
};

export function FeProfilePage({ kind }: { kind: FeProfileKind }) {
  const { article = '' } = useParams();
  return (
    <FeGuard>
      {(season) =>
        validArticle(article) ? (
          <Profile key={`${kind}:${article}`} season={season} article={article} kind={kind} />
        ) : (
          <section className="page">
            <h1>Недопустимый адрес профиля</h1>
            <Link to={`/fe/${season}`}>Formula E</Link>
          </section>
        )
      }
    </FeGuard>
  );
}

function ProfilePhoto({ article, kind, files }: { article: string; kind: FeProfileKind; files?: string[] }) {
  const state = usePhoto(files ? `fe:${article}:${kind}` : null, () =>
    getArticlePhoto(article, { width: kind === 'driver' ? 480 : 900, photosOnly: true, files }),
  );
  return <PhotoFigure state={state} alt={article} shape={kind === 'driver' ? 'portrait' : 'wide'} />;
}

function Profile({ season, article, kind }: { season: string; article: string; kind: FeProfileKind }) {
  const res = useFeProfile(article, kind);
  const canonical = res.status === 'success' ? res.data.article : article;
  if (res.status === 'error' && res.error instanceof Error && res.error.message === 'Статья не найдена') {
    return (
      <section className="page">
        <h1>Профиль не найден</h1>
        <p role="alert">Статья не найдена в Википедии.</p>
        <Link to={`/fe/${season}`}>Formula E</Link>
      </section>
    );
  }
  const [back, backLabel] = BACK[kind];
  return (
    <section className="page">
      <nav className="crumbs" aria-label="Навигация">
        <Link to={`/fe/${season}/${back}`}>
          ← {backLabel} {seasonLabel(season)}
        </Link>
      </nav>
      <PageHeader
        eyebrow={`Formula E ${seasonLabel(season)} · ${KIND_LABEL[kind]}`}
        title={canonical.replace(/_/g, ' ')}
        aside={
          res.status === 'success' ? (
            <ProfilePhoto article={canonical} kind={kind} files={res.data.photoFiles} />
          ) : null
        }
      >
        {kind !== 'eprix' && (
          <div className="profile-actions">
            <ProfileFav
              kind={kind === 'driver' ? 'drivers' : 'teams'}
              article={article}
              canonical={canonical}
            />
            {kind === 'driver' && (
              <Link
                className="btn btn--ghost btn--small"
                to={`/fe/${season}/compare?${new URLSearchParams({ a: canonical })}`}
              >
                Сравнить с другим пилотом
              </Link>
            )}
          </div>
        )}
      </PageHeader>
      {kind !== 'eprix' && <SeasonStanding season={season} articles={[article, canonical]} kind={kind} />}
      <DataState state={res}>
        {(profile) => {
          const tiles = TILES[kind]
            .map((label) => profile.facts.find((f) => f.label === label))
            .filter((f): f is Fact => !!f);
          const rest = profile.facts.filter((f) => !tiles.includes(f));
          return (
            <>
              {tiles.length > 0 && (
                <div className="stats">
                  {tiles.map((f) => (
                    <Stat key={f.label} label={f.label} value={f.value} />
                  ))}
                </div>
              )}
              {(rest.length > 0 || profile.biography) && (
                <section className="fe-profile-summary">
                  <h2 className="section-title">
                    {kind === 'driver' ? 'О пилоте' : kind === 'team' ? 'О команде' : 'О гонке'}
                  </h2>
                  {rest.length > 0 && (
                    <dl className="fe-profile-facts">
                      {rest.map((f) => (
                        <div key={f.label}>
                          <dt>{f.label}</dt>
                          <dd>{f.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {profile.biography && (
                    <>
                      <p className="muted small">Вступление статьи, на английском языке.</p>
                      <p lang="en">{profile.biography}</p>
                    </>
                  )}
                </section>
              )}
              {tiles.length > 0 && (
                <p className="muted small">Цифры — из карточки статьи, как их публикует источник.</p>
              )}
              {profile.tables.length === 0 && (
                <p className="state state--empty">
                  {kind === 'eprix'
                    ? 'В статье нет таблицы победителей.'
                    : 'В статье нет таблицы результатов Formula E.'}
                </p>
              )}
              {profile.tables.map((table, i) => (
                <HistoryTable key={i} table={table} season={season} article={profile.article} />
              ))}
            </>
          );
        }}
      </DataState>
      <WikiSourceNote />
    </section>
  );
}

/** Stores the article from the address, so lists that link the same title highlight it. */
function ProfileFav({
  kind,
  article,
  canonical,
}: {
  kind: 'drivers' | 'teams';
  article: string;
  canonical: string;
}) {
  const { isFav, toggle } = useFeFavorites();
  const saved = [article, canonical].find((a) => isFav(kind, a));
  return (
    <FavToggle on={saved !== undefined} name={canonical} onToggle={() => toggle(kind, saved ?? article)} />
  );
}

function SeasonStanding({
  season,
  articles,
  kind,
}: {
  season: string;
  articles: string[];
  kind: 'driver' | 'team';
}) {
  const res = useFeSeason(season);
  return (
    <div className="fe-profile-season">
      <h2 className="section-title">Сезон {seasonLabel(season)}</h2>
      <DataState state={res}>
        {(data) => {
          const rows = data.standings.flatMap((table) =>
            table.kind !== (kind === 'driver' ? 'drivers' : 'teams')
              ? []
              : table.rows
                  .filter((row) => row.name.article && articles.includes(row.name.article))
                  .map((row) => ({ ...row, table })),
          );
          return rows.length ? (
            <SortableTable
              caption={`Зачёты ${seasonLabel(season)}`}
              rows={rows}
              rowKey={(row) => row.table.id + row.name.name}
              columns={[
                {
                  key: 'table',
                  header: 'Зачёт',
                  render: (row) => (
                    <Link to={`/fe/${season}/standings?t=${row.table.id}`}>{row.table.title}</Link>
                  ),
                },
                { key: 'pos', header: 'Место', align: 'center', render: (row) => row.posText || '—' },
                { key: 'points', header: 'Очки', align: 'right', render: (row) => row.points || '—' },
              ]}
            />
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
  Edition: 'Год',
  Team: 'Команда',
  Chassis: 'Шасси',
  Powertrain: 'Силовая установка',
  'Pos.': 'Место',
  Pos: 'Место',
  'T.C.': 'Место',
  Points: 'Очки',
  Track: 'Трасса',
  Winner: 'Победитель',
  Second: '2-е место',
  Third: '3-е место',
  'Pole position': 'Поул',
  'Fastest lap': 'Быстрый круг',
};

function HistoryTable({
  table,
  season,
  article,
}: {
  table: FeProfileTable;
  season: string;
  article: string;
}) {
  const shown = summaryColumns(table).filter((i) => table.columns[i] !== 'Ref');
  const rows = table.kind === 'fe' ? summaryRows(table) : table.rows;
  const columns: Column<ProfileRow>[] = shown.map((i, n) => ({
    key: String(i),
    header: HEADERS[table.columns[i]] ?? table.columns[i],
    render: (row) => <Cell cell={row.cells[i]} header={table.columns[i]} />,
    ...(n === 0 ? { sortValue: (row: ProfileRow) => row.season } : {}),
  }));
  return (
    <>
      <h2 className="section-title">
        {table.kind === 'winners' ? 'Победители по годам' : 'Результаты по сезонам'}
      </h2>
      {table.kind === 'fe' && (
        <p className="muted small">
          Итоги сезонов: место и очки — как у источника. Результаты отдельных гонок — в{' '}
          <a
            href={`${articleUrl(article)}#${table.title.replace(/ /g, '_')}`}
            target="_blank"
            rel="noreferrer"
          >
            таблице статьи
          </a>
          .
        </p>
      )}
      <SortableTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(rows.indexOf(row))}
        caption={table.title}
        rowClassName={(row) => (row.season === season ? 'fe-profile-current' : undefined)}
      />
    </>
  );
}

/** The complete source text; only named people and teams become links. */
function Cell({ cell, header }: { cell: ProfileCell; header: string }) {
  const kind = /^(Team|Entrant)$/i.test(header)
    ? 'team'
    : /^(Drivers?|Winner|Second|Third|Pole position|Fastest lap)$/i.test(header)
      ? 'driver'
      : null;
  let cursor = 0;
  const pieces = [];
  for (const link of cell.links) {
    const at = cell.text.indexOf(link.name, cursor);
    if (at < 0 || !link.name) continue;
    pieces.push(<Fragment key={`${at}:text`}>{cell.text.slice(cursor, at)}</Fragment>);
    pieces.push(
      kind && link.article && validArticle(link.article) ? (
        <NameFlag key={at} who={{ ...link, flag: null }} kind={kind} />
      ) : (
        <Fragment key={at}>{link.name}</Fragment>
      ),
    );
    cursor = at + link.name.length;
  }
  pieces.push(<Fragment key="tail">{cell.text.slice(cursor) || (cell.text ? '' : '—')}</Fragment>);
  return <span className={cell.tone ? `fe-result fe-result--${cell.tone}` : undefined}>{pieces}</span>;
}
