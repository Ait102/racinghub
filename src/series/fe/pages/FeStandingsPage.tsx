import { Link, useSearchParams } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { StandingsCharts } from '../../../components/StandingsCharts';
import type { StandingKind, StandingTable } from '../../../lib/wikiStandings';
import { NameFlag, WikiSourceNote } from '../components/bits';
import { seasonLabel } from '../data/seasons';
import { feStandingProgress } from '../data/standingProgress';
import type { FeRound } from '../domain/types';
import { useFeSeason } from '../hooks/data';
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
