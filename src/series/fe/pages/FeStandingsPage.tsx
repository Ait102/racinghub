import { useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { SortableTable, type Column } from '../../../components/SortableTable';
import { StandingsCharts } from '../../../components/StandingsCharts';
import { PointsWithBar, posClass, SearchBox } from '../../../components/ui';
import type { Named, StandingKind, StandingRow, StandingTable } from '../../../lib/wikiStandings';
import { NameFlag, WikiSourceNote } from '../components/bits';
import { seasonLabel } from '../data/seasons';
import { feStandingProgress } from '../data/standingProgress';
import type { FeRound, FeSeasonData } from '../domain/types';
import { useFeParticipants, useFeSeason } from '../hooks/data';
import { FeGuard } from './common';

// The championship pages follow Formula 1: "Пилоты" is the drivers' standings, "Команды" the teams'
// (and the manufacturers' trophy), "График" the points after each race. Entry lists and comparison
// are linked from them.

const KIND_LABELS: Record<StandingKind, string> = {
  drivers: 'Пилоты',
  teams: 'Команды',
  manufacturers: 'Производители',
};

const empty = (data: FeSeasonData) =>
  data.unavailable ? 'Статья сезона ещё не опубликована в Википедии.' : 'Зачётов у источника пока нет.';

export function FeDriversPage() {
  return <FeGuard>{(season) => <Championship key={season} season={season} drivers />}</FeGuard>;
}

export function FeTeamsPage() {
  return <FeGuard>{(season) => <Championship key={season} season={season} drivers={false} />}</FeGuard>;
}

/** Old address of the standings page: drivers' tables open "Пилоты", the others "Команды". */
export function FeStandingsRedirect() {
  const { season = '' } = useParams();
  const [params] = useSearchParams();
  const t = params.get('t');
  const page = !t || /driver/i.test(t) ? 'drivers' : 'teams';
  return <Navigate to={`/fe/${season}/${page}${t ? `?t=${encodeURIComponent(t)}` : ''}`} replace />;
}

export function FeChartPage() {
  return <FeGuard>{(season) => <Chart key={season} season={season} />}</FeGuard>;
}

/** Chips to switch between tables of one page (e.g. teams and manufacturers). */
function TablePicker({
  tables,
  current,
  always = false,
  label = 'Зачёт',
}: {
  tables: StandingTable[];
  current: StandingTable;
  /** Show a single table's chip too (the chart page lists every kind). */
  always?: boolean;
  label?: string;
}) {
  const [, setParams] = useSearchParams();
  if (tables.length < 2 && !always) return null;
  return (
    <div className="chips" role="group" aria-label={label}>
      {tables.map((table) => (
        <button
          key={table.id}
          type="button"
          className="chip"
          aria-pressed={current.id === table.id}
          onClick={() => setParams({ t: table.id }, { replace: true })}
        >
          {table.title}
        </button>
      ))}
    </div>
  );
}

function Championship({ season, drivers }: { season: string; drivers: boolean }) {
  const res = useFeSeason(season);
  // Teams of each driver from the entry list (the standings table has no team column), as in F1.
  const entries = useFeParticipants(drivers ? season : null, true);
  const teamsOf = (who: Named) =>
    entries.status === 'success'
      ? (entries.data.find((p) => (p.who.article && p.who.article === who.article) || p.who.name === who.name)
          ?.partners ?? [])
      : [];
  const [params] = useSearchParams();
  const [query, setQuery] = useState('');
  return (
    <section className="page">
      <PageHeader
        eyebrow={`Formula E ${seasonLabel(season)}`}
        title={drivers ? 'Личный зачёт' : 'Командный зачёт'}
      >
        <p className="lead">Места и очки — как у источника, без пересчёта.</p>
        <p className="fe-page-links">
          {drivers && (
            <Link className="btn btn--ghost btn--small" to={`/fe/${season}/compare`}>
              Сравнить пилотов →
            </Link>
          )}
          <Link className="btn btn--ghost btn--small" to={`/fe/${season}/entries${drivers ? '' : '/teams'}`}>
            {drivers ? 'Заявка: пилоты →' : 'Заявка: команды →'}
          </Link>
        </p>
      </PageHeader>
      <DataState
        state={res}
        isEmpty={(data) =>
          !data.standings.some((t) => (drivers ? t.kind === 'drivers' : t.kind !== 'drivers'))
        }
        emptyText={res.status === 'success' ? empty(res.data) : 'Зачётов у источника пока нет.'}
        loadingRows={10}
      >
        {(data) => {
          const tables = data.standings.filter((t) =>
            drivers ? t.kind === 'drivers' : t.kind !== 'drivers',
          );
          const current = tables.find((t) => t.id === params.get('t')) ?? tables[0];
          const q = query.trim().toLocaleLowerCase();
          const rows = current.rows.filter(
            (row) =>
              !q ||
              row.name.name.toLocaleLowerCase().includes(q) ||
              (row.extra ?? '').toLocaleLowerCase().includes(q),
          );
          return (
            <>
              <TablePicker tables={tables} current={current} />
              <SearchBox
                value={query}
                onChange={setQuery}
                label={drivers ? 'Поиск пилота или команды' : 'Поиск команды'}
              />
              {rows.length === 0 ? (
                <p className="muted">Ничего не найдено.</p>
              ) : (
                <SortableTable
                  columns={summaryColumns(current, drivers ? teamsOf : null)}
                  rows={rows}
                  rowKey={(row) => `${row.posText}|${row.name.name}`}
                  caption={`${current.title} — итог`}
                />
              )}
              <StandingsTable table={current} season={season} rounds={data.rounds} />
              <Legend />
              <WikiSourceNote />
            </>
          );
        }}
      </DataState>
    </section>
  );
}

/** The table at the top of the page, as Formula 1 shows it: place, name, team, points with a bar. */
function summaryColumns(
  table: StandingTable,
  teamsOf: ((who: Named) => Named[]) | null,
): Column<StandingRow>[] {
  const leader = table.rows[0]?.pointsValue ?? null;
  const kind = table.kind === 'drivers' ? 'driver' : table.kind === 'teams' ? 'team' : 'external';
  return [
    {
      key: 'pos',
      header: 'Позиция',
      abbr: 'Поз.',
      align: 'center',
      render: (row) => <span className={posClass('pos', row.pos)}>{row.posText || '—'}</span>,
      sortValue: (row) => row.pos,
    },
    {
      key: 'name',
      header: table.kind === 'drivers' ? 'Пилот' : table.kind === 'teams' ? 'Команда' : 'Производитель',
      render: (row) => <NameFlag who={row.name} kind={kind} emblem={table.kind !== 'drivers'} />,
      sortValue: (row) => row.name.name,
    },
    ...(teamsOf
      ? [
          {
            key: 'team',
            header: 'Команда',
            optional: true,
            render: (row: StandingRow) => {
              const teams = teamsOf(row.name);
              return teams.length ? (
                <span className="wiki-list">
                  {teams.map((t) => (
                    <NameFlag key={t.article ?? t.name} who={t} kind="team" emblem />
                  ))}
                </span>
              ) : (
                '—'
              );
            },
          },
        ]
      : []),
    ...(table.extraHeader
      ? [
          {
            key: 'extra',
            header:
              table.extraHeader === 'Team'
                ? 'Команда'
                : table.extraHeader === 'No.'
                  ? 'Номер'
                  : table.extraHeader,
            optional: true,
            render: (row: StandingRow) => row.lineLabels?.filter(Boolean).join(', ') || row.extra || '—',
          },
        ]
      : []),
    {
      key: 'points',
      header: 'Очки',
      align: 'right' as const,
      render: (row) =>
        row.pointsValue === null ? (
          row.points || '—'
        ) : (
          <PointsWithBar points={row.pointsValue} leader={leader} />
        ),
      sortValue: (row) => row.pointsValue,
    },
  ];
}

function Chart({ season }: { season: string }) {
  const res = useFeSeason(season);
  const [params] = useSearchParams();
  return (
    <section className="page">
      <PageHeader eyebrow={`Formula E ${seasonLabel(season)}`} title="Борьба за чемпионство">
        <p className="lead">Очки после каждой гонки — по официальным классификациям, без пересчёта.</p>
      </PageHeader>
      <DataState
        state={res}
        isEmpty={(data) => data.standings.length === 0}
        emptyText={res.status === 'success' ? empty(res.data) : 'Зачётов у источника пока нет.'}
      >
        {(data) => {
          const current = data.standings.find((t) => t.id === params.get('t')) ?? data.standings[0];
          return (
            <>
              <div className="standings-picker">
                {(['drivers', 'teams', 'manufacturers'] as StandingKind[])
                  .filter((kind) => data.standings.some((t) => t.kind === kind))
                  .map((kind) => (
                    <div className="standings-picker__group" key={kind}>
                      <span className="standings-picker__label">{KIND_LABELS[kind]}</span>
                      <TablePicker
                        tables={data.standings.filter((t) => t.kind === kind)}
                        current={current}
                        always
                        label={KIND_LABELS[kind]}
                      />
                    </div>
                  ))}
              </div>
              <StandingsCharts
                key={`${season}:${current.id}`}
                table={current}
                seriesId="fe"
                progress={feStandingProgress(season, current)}
              />
              <WikiSourceNote />
            </>
          );
        }}
      </DataState>
    </section>
  );
}

function StandingsTable({
  table,
  season,
  rounds,
}: {
  table: StandingTable;
  season: string;
  rounds: FeRound[];
}) {
  return (
    <>
      <h2 className="section-title">Результаты по гонкам</h2>
      {table.rows.some((row) => row.lines.length > 1) && (
        <p className="muted small">
          Каждая строка результатов — отдельная машина. Общие место и очки опубликованы источником.
        </p>
      )}
      <div className="table-wrap fe-standings-scroll">
        <table className="table fe-standings">
          <caption className="visually-hidden">{table.title}</caption>
          <thead>
            <tr>
              <th scope="col" className="align-center">
                Поз.
              </th>
              <th scope="col">
                {table.kind === 'drivers' ? 'Пилот' : table.kind === 'teams' ? 'Команда' : 'Производитель'}
              </th>
              {table.extraHeader && (
                <th scope="col">
                  {table.extraHeader === 'Team'
                    ? 'Команда'
                    : table.extraHeader === 'No.'
                      ? '№'
                      : table.extraHeader}
                </th>
              )}
              {table.rounds.map((column, index) => {
                // Both races in a double-header link to one article; preserve column order within it.
                const occurrence = table.rounds
                  .slice(0, index)
                  .filter((r) => r.report === column.report).length;
                const linked = column.report
                  ? rounds.filter((r) => r.report === column.report)[occurrence]
                  : undefined;
                const round = linked ?? (rounds.length === table.rounds.length ? rounds[index] : undefined);
                return (
                  <th
                    key={`${column.abbr}-${index}`}
                    scope="col"
                    className="align-center fe-standings__round"
                  >
                    {round ? (
                      <Link
                        to={`/fe/${season}/race/${round.round}`}
                        title={`${column.abbr} · этап ${round.round}`}
                      >
                        {column.abbr}
                      </Link>
                    ) : (
                      column.abbr
                    )}
                  </th>
                );
              })}
              <th scope="col" className="align-right">
                Очки
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.flatMap((row, index) => {
              const lines = row.lines.length > 0 ? row.lines : [[]];
              return lines.map((line, lineIndex) => (
                <tr
                  key={`${index}-${lineIndex}`}
                  className={
                    row.pos !== null && row.pos >= 1 && row.pos <= 3 ? `row--p${row.pos}` : undefined
                  }
                >
                  {lineIndex === 0 && (
                    <>
                      <td className="align-center" rowSpan={lines.length}>
                        <strong>{row.posText || '—'}</strong>
                      </td>
                      <td rowSpan={lines.length}>
                        <NameFlag
                          who={row.name}
                          kind={
                            table.kind === 'drivers' ? 'driver' : table.kind === 'teams' ? 'team' : 'external'
                          }
                          emblem={table.kind !== 'drivers'}
                        />
                      </td>
                    </>
                  )}
                  {table.extraHeader && (
                    <td className="muted">
                      {row.lineLabels?.[lineIndex] || (lineIndex === 0 ? row.extra : null) || '—'}
                    </td>
                  )}
                  {table.rounds.map((_, columnIndex) => (
                    <td key={columnIndex} className="align-center fe-standings__cell">
                      <span
                        className={`fe-result${line[columnIndex]?.tone ? ` fe-result--${line[columnIndex].tone}` : ''}`}
                      >
                        {line[columnIndex]?.text || '·'}
                      </span>
                    </td>
                  ))}
                  {lineIndex === 0 && (
                    <td className="align-right" rowSpan={lines.length}>
                      <strong>{row.points || '—'}</strong>
                    </td>
                  )}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Legend() {
  const items = [
    ['gold', 'Победа'],
    ['silver', '2-е место'],
    ['bronze', '3-е место'],
    ['points', 'В очках'],
    ['nopoints', 'Без очков'],
    ['retired', 'Сход'],
    ['excluded', 'Дисквалификация'],
    ['dns', 'Не стартовал'],
    ['withdrawn', 'Отозван'],
  ] as const;
  return (
    <p className="fe-legend small">
      {items.map(([tone, label]) => (
        <span className="fe-legend__item" key={tone}>
          <span className={`fe-result fe-result--${tone}`} aria-hidden="true">
            ·
          </span>
          {label}
        </span>
      ))}
    </p>
  );
}
