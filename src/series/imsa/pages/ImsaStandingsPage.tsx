import { Link, useSearchParams } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { PlacesSection } from '../../../components/PlacesSection';
import { seasonClasses, type ImsaSeasonData, type ImsaStanding } from '../domain/season';
import { useImsaSeason } from '../hooks/data';
import { ClassTag, IMSA_EMPTY, ImsaGuard, ImsaName, ImsaResult, ImsaSourceNote } from './common';

const LEGEND = [
  ['gold', 'Победа'],
  ['silver', '2-е место'],
  ['bronze', '3-е место'],
  ['points', 'Финиш'],
  ['nopoints', 'Не классифицирован'],
  ['retired', 'Сход'],
  ['excluded', 'Дисквалификация'],
  ['dns', 'Не стартовал'],
] as const;

export function ImsaStandingsPage() {
  return <ImsaGuard>{(season) => <Standings season={season} />}</ImsaGuard>;
}

function Standings({ season }: { season: string }) {
  const res = useImsaSeason(season);
  const [params, setParams] = useSearchParams();
  return (
    <section className="page">
      <PageHeader eyebrow={`IMSA ${season}`} title="Зачёты">
        <p className="lead">
          Отдельные зачёты в каждом классе. Места и очки — как у источника, без пересчёта.
        </p>
      </PageHeader>
      <DataState
        state={res}
        isEmpty={(data) => data.standings.length === 0}
        emptyText={IMSA_EMPTY(res.status === 'success' ? res.data.unavailable : false)}
      >
        {(data) => {
          const current = data.standings.find((t) => t.id === params.get('t')) ?? data.standings[0];
          return (
            <>
              <div className="standings-picker">
                {seasonClasses(data)
                  .filter((cls) => data.standings.some((t) => t.cls === cls))
                  .map((cls) => (
                    <div className="standings-picker__group" key={cls}>
                      <span className="standings-picker__label">
                        <ClassTag cls={cls} />
                      </span>
                      <div className="chips" role="group" aria-label={`Класс ${cls}`}>
                        {data.standings
                          .filter((t) => t.cls === cls)
                          .map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              className="chip"
                              aria-pressed={current.id === t.id}
                              onClick={() => setParams({ t: t.id }, { replace: true })}
                            >
                              {t.title.replace(` · ${cls}`, '')}
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
              <Table table={current} data={data} />
              <p className="imsa-legend small">
                {LEGEND.map(([tone, label]) => (
                  <span className="imsa-legend__item" key={tone}>
                    <span className={`imsa-result imsa-result--${tone}`} aria-hidden="true">
                      ·
                    </span>
                    {label}
                  </span>
                ))}
              </p>
              <PlacesSection key={`${season}:${current.id}`} table={current} seriesId="imsa" />
              <ImsaSourceNote />
            </>
          );
        }}
      </DataState>
    </section>
  );
}

function Table({ table, data }: { table: ImsaStanding; data: ImsaSeasonData }) {
  // Each column links to the race its header names (the class does not run every round).
  const roundOf = new Map(data.races.flatMap((r) => (r.report ? [[r.report, r.round] as const] : [])));
  return (
    <>
      <h2 className="section-title">{table.title}</h2>
      <div className="table-wrap imsa-standings-scroll">
        <table className="table imsa-standings">
          <caption className="visually-hidden">{table.title}</caption>
          <thead>
            <tr>
              <th scope="col" className="align-center">
                Поз.
              </th>
              <th scope="col">
                {table.kind === 'drivers' ? 'Пилоты' : table.kind === 'teams' ? 'Команда' : table.nameHeader}
              </th>
              {table.extraHeader && <th scope="col">Машина</th>}
              {table.rounds.map((column, i) => {
                const round = column.report ? roundOf.get(column.report) : undefined;
                return (
                  <th key={`${column.abbr}-${i}`} scope="col" className="align-center imsa-standings__round">
                    {round ? (
                      <Link to={`/imsa/${data.id}/race/${round}`} title={`Этап ${round}`}>
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
                        <ImsaName who={row.name} emblem={table.kind === 'manufacturers'} />
                      </td>
                    </>
                  )}
                  {table.extraHeader && (
                    <td className="muted">
                      {row.lineLabels?.[lineIndex] || (lineIndex === 0 ? row.extra : null) || '—'}
                    </td>
                  )}
                  {table.rounds.map((_, i) => (
                    <td key={i} className="align-center imsa-standings__cell">
                      <ImsaResult cell={line[i]} />
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
