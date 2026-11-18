// Profile of a driver, team or circuit from its Wikipedia article (IMSA, DTM): photo, the
// infobox's own figures, facts, the lead and the season summaries of the series' results tables.
import { Fragment, type ReactNode } from 'react';

import { getArticlePhoto } from '../api/wikimedia';
import { articleUrl } from '../api/wikipedia';
import {
  seasonColumns,
  seasonRows,
  type Fact,
  type ProfileCell,
  type ProfileRow,
  type ProfileTable,
  type SeriesProfile,
  type SeriesProfileKind,
} from '../lib/wikiProfile';
import type { Named } from '../lib/wikiStandings';
import { PhotoFigure, usePhoto } from './PhotoFigure';
import { SortableTable, type Column } from './SortableTable';
import { Stat } from './ui';

/** Infobox figures shown as tiles; the other facts go to the list. */
const TILES: Record<SeriesProfileKind, string[]> = {
  driver: ['Старты', 'Победы', 'Подиумы', 'Поулы', 'Титулы'],
  team: ['Основана', 'Командные титулы', 'Титулы пилотов'],
  circuit: ['Длина круга', 'Повороты', 'Открыта'],
};

const HEADERS: Record<string, string> = {
  Year: 'Сезон',
  Season: 'Сезон',
  Team: 'Команда',
  Entrant: 'Команда',
  Class: 'Класс',
  Car: 'Машина',
  Chassis: 'Шасси',
  Make: 'Марка',
  'No.': '№',
  No: '№',
  Drivers: 'Пилоты',
  Driver: 'Пилот',
  'Pos.': 'Место',
  Pos: 'Место',
  Position: 'Место',
  Rank: 'Место',
  DC: 'Место',
  'D.C.': 'Место пилотов',
  'T.C.': 'Место команды',
  Points: 'Очки',
  'Pts.': 'Очки',
  Pts: 'Очки',
};

export function SeriesProfilePhoto({ article, kind }: { article: string; kind: SeriesProfileKind }) {
  const state = usePhoto(`profile:${kind}:${article}`, () =>
    getArticlePhoto(article, { width: kind === 'driver' ? 480 : 900, photosOnly: true }),
  );
  return <PhotoFigure state={state} alt={article} shape={kind === 'driver' ? 'portrait' : 'wide'} />;
}

export function SeriesProfileView({
  profile,
  season,
  seriesName,
  renderName,
}: {
  profile: SeriesProfile;
  season: string;
  seriesName: string;
  /** A linked name in a results table (driver or team), or null for plain text. */
  renderName: (who: Named, header: string) => ReactNode | null;
}) {
  const tiles = TILES[profile.kind]
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
        <section className="wiki-profile-summary">
          <h2 className="section-title">
            {profile.kind === 'driver' ? 'О пилоте' : profile.kind === 'team' ? 'О команде' : 'О трассе'}
          </h2>
          {rest.length > 0 && (
            <dl className="wiki-profile-facts">
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
      {profile.facts.length > 0 && (
        <p className="muted small">Цифры — из карточки статьи, как их публикует источник.</p>
      )}
      {profile.kind !== 'circuit' && profile.tables.length === 0 && (
        <p className="state state--empty">В статье нет таблицы результатов {seriesName}.</p>
      )}
      {profile.tables.map((table, i) => (
        <SeasonTable
          key={i}
          table={table}
          season={season}
          article={profile.article}
          renderName={renderName}
        />
      ))}
    </>
  );
}

function SeasonTable({
  table,
  season,
  article,
  renderName,
}: {
  table: ProfileTable;
  season: string;
  article: string;
  renderName: (who: Named, header: string) => ReactNode | null;
}) {
  const shown = seasonColumns(table);
  const rows = seasonRows(table);
  const columns: Column<ProfileRow>[] = shown.map((i, n) => ({
    key: String(i),
    header: HEADERS[table.columns[i]] ?? table.columns[i],
    render: (row) => <Cell cell={row.cells[i]} header={table.columns[i]} renderName={renderName} />,
    ...(n === 0 ? { sortValue: (row: ProfileRow) => row.season } : {}),
  }));
  return (
    <>
      <h2 className="section-title">Результаты по сезонам</h2>
      <p className="muted small">
        Итоги сезонов: место и очки — как у источника. Результаты отдельных гонок — в{' '}
        <a href={`${articleUrl(article)}#${table.title.replace(/ /g, '_')}`} target="_blank" rel="noreferrer">
          таблице статьи
        </a>
        .
      </p>
      <SortableTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(rows.indexOf(row))}
        caption={table.title}
        rowClassName={(row) => (row.season === season ? 'wiki-profile-current' : undefined)}
      />
    </>
  );
}

/** The complete source text; only named people and teams become links. */
function Cell({
  cell,
  header,
  renderName,
}: {
  cell: ProfileCell;
  header: string;
  renderName: (who: Named, header: string) => ReactNode | null;
}) {
  let cursor = 0;
  const pieces = [];
  for (const link of cell.links) {
    const at = cell.text.indexOf(link.name, cursor);
    if (at < 0 || !link.name) continue;
    pieces.push(<Fragment key={`${at}:text`}>{cell.text.slice(cursor, at)}</Fragment>);
    pieces.push(<Fragment key={at}>{renderName(link, header) ?? link.name}</Fragment>);
    cursor = at + link.name.length;
  }
  pieces.push(<Fragment key="tail">{cell.text.slice(cursor) || (cell.text ? '' : '—')}</Fragment>);
  return <span className={cell.tone ? `wiki-result wiki-result--${cell.tone}` : undefined}>{pieces}</span>;
}
