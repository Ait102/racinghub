import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { FavToggle } from '../../../components/FavButton';
import { PageHeader } from '../../../components/PageHeader';
import { PlacesChart, seriesStyle } from '../../../components/PlacesChart';
import { placeSeries } from '../../../lib/places';
import { validArticle } from '../../../lib/wikiArticle';
import type { StandingKind, StandingTable } from '../../../lib/wikiStandings';
import { NameFlag, WikiSourceNote } from '../components/bits';
import { seasonLabel } from '../data/seasons';
import type { FeRound } from '../domain/types';
import { useFeSeason } from '../hooks/data';
import { useFeFavorites } from '../hooks/favorites';
import { FeGuard } from './common';

const KIND_LABELS: Record<StandingKind, string> = {
  drivers: 'Пилоты',
  teams: 'Команды',
  manufacturers: 'Производители',
};

export function FeStandingsPage() {
  return <FeGuard>{(season) => <Standings season={season} />}</FeGuard>;
}

function Standings({ season }: { season: string }) {
  const res = useFeSeason(season);
  const [params, setParams] = useSearchParams();
  return (
    <section className="page">
      <PageHeader eyebrow={`Formula E ${seasonLabel(season)}`} title="Зачёты">
        <p className="lead">Места и очки — как у источника, без пересчёта.</p>
      </PageHeader>
      <DataState
        state={res}
        isEmpty={(data) => data.standings.length === 0}
        emptyText={
          res.status === 'success' && res.data.unavailable
            ? 'Статья сезона ещё не опубликована в Википедии.'
            : 'Зачётов у источника пока нет.'
        }
      >
        {(data) => {
          const current = data.standings.find((table) => table.id === params.get('t')) ?? data.standings[0];
          return (
            <>
              <div className="standings-picker">
                {(['drivers', 'teams', 'manufacturers'] as StandingKind[])
                  .filter((kind) => data.standings.some((table) => table.kind === kind))
                  .map((kind) => (
                    <div className="standings-picker__group" key={kind}>
                      <span className="standings-picker__label">{KIND_LABELS[kind]}</span>
                      <div className="chips" role="group" aria-label={KIND_LABELS[kind]}>
                        {data.standings
                          .filter((table) => table.kind === kind)
                          .map((table) => (
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
                    </div>
                  ))}
              </div>
              <StandingsTable table={current} season={season} rounds={data.rounds} />
              <Legend />
              <PlacesSection key={current.id} table={current} />
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
  const { isFav, toggle } = useFeFavorites();
  const favKind = table.kind === 'drivers' ? 'drivers' : 'teams';
  const canFavorite = table.kind !== 'manufacturers';
  return (
    <>
      <h2 className="section-title">{table.title}</h2>
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
              {canFavorite && (
                <th scope="col">
                  <span className="visually-hidden">Избранное</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {table.rows.flatMap((row, index) => {
              const lines = row.lines.length > 0 ? row.lines : [[]];
              const article = row.name.article;
              return lines.map((line, lineIndex) => (
                <tr
                  key={`${index}-${lineIndex}`}
                  className={
                    [
                      row.pos !== null && row.pos >= 1 && row.pos <= 3 ? `row--p${row.pos}` : '',
                      canFavorite && article && isFav(favKind, article) ? 'row--fav' : '',
                    ]
                      .filter(Boolean)
                      .join(' ') || undefined
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
                    <>
                      <td className="align-right" rowSpan={lines.length}>
                        <strong>{row.points || '—'}</strong>
                      </td>
                      {canFavorite && (
                        <td rowSpan={lines.length}>
                          {article && validArticle(article) && (
                            <FavToggle
                              on={isFav(favKind, article)}
                              name={row.name.name}
                              onToggle={() => toggle(favKind, article)}
                            />
                          )}
                        </td>
                      )}
                    </>
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

const TOP = [5, 10] as const;

function PlacesSection({ table }: { table: StandingTable }) {
  const [top, setTop] = useState<(typeof TOP)[number]>(5);
  const [pointed, setPointed] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const series = placeSeries(table, top);
  const highlight = pointed ?? (series.some((s) => s.id === picked) ? picked : null);
  if (series.length === 0) return null;
  return (
    <>
      <h2 className="section-title">Места по этапам</h2>
      <p className="muted small">
        Места в отдельных гонках — как у источника. Это не положение в чемпионате после этапа. Очки не
        суммируются. Сходы, NC и DSQ показаны крестиком в строке «сход»; пропуски — пунктиром.
      </p>
      <p className="muted small">
        Наведите курсор или коснитесь графика, чтобы увидеть результаты этапа. С клавиатуры — стрелки, Home,
        End и Escape. Наведение или нажатие на имя в легенде выделяет линию.
      </p>
      <div className="chips" role="group" aria-label="Сколько строк зачёта показать">
        {TOP.map((count) => (
          <button
            key={count}
            type="button"
            className="chip"
            aria-pressed={top === count}
            onClick={() => setTop(count)}
          >
            Топ-{count}
          </button>
        ))}
      </div>
      <div className="card chart-card fe-places-card">
        <PlacesChart
          rounds={table.rounds.map((round) => round.abbr)}
          series={series}
          highlight={highlight}
          classPrefix="fe-places-chart"
        />
        <ul className="legend" onMouseLeave={() => setPointed(null)}>
          {series.map((s, index) => (
            <li key={s.id}>
              <button
                type="button"
                className="fe-legend-pick"
                aria-pressed={picked === s.id}
                onMouseEnter={() => setPointed(s.id)}
                onFocus={() => setPointed(s.id)}
                onBlur={() => setPointed(null)}
                onClick={() => setPicked((current) => (current === s.id ? null : s.id))}
              >
                <svg width="26" height="10" aria-hidden="true">
                  <line
                    x1="1"
                    x2="25"
                    y1="5"
                    y2="5"
                    stroke={seriesStyle(index).color}
                    strokeWidth="3"
                    strokeDasharray={seriesStyle(index).dash}
                  />
                </svg>
                {s.label}
              </button>
            </li>
          ))}
        </ul>
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
