import { Link, useSearchParams } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { PlacesSection } from '../../../components/PlacesSection';
import type { StandingKind, StandingTable } from '../../../lib/wikiStandings';
import { raceColumn, type DtmSeasonData } from '../domain/season';
import { useDtmSeason } from '../hooks/data';
import { DTM_EMPTY, DtmGuard, DtmName, DtmResult, DtmSourceNote } from './common';

const KIND_LABELS: Record<StandingKind, string> = {
  drivers: 'Пилоты',
  teams: 'Команды',
  manufacturers: 'Производители',
};

const LEGEND = [
  ['gold', 'Победа'],
  ['silver', '2-е место'],
  ['bronze', '3-е место'],
  ['points', 'В очках'],
  ['nopoints', 'Без очков'],
  ['retired', 'Сход'],
  ['excluded', 'Дисквалификация'],
  ['dns', 'Не стартовал'],
] as const;

export function DtmStandingsPage() {
  return <DtmGuard>{(season) => <Standings season={season} />}</DtmGuard>;
}

function Standings({ season }: { season: string }) {
  const res = useDtmSeason(season);
  const [params, setParams] = useSearchParams();
  return (
    <section className="page">
      <PageHeader eyebrow={`DTM ${season}`} title="Зачёты">
        <p className="lead">Места и очки — как у источника, без пересчёта.</p>
      </PageHeader>
      <DataState
        state={res}
        isEmpty={(data) => data.standings.length === 0}
        emptyText={DTM_EMPTY(res.status === 'success' ? res.data.unavailable : false)}
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
                      <div className="chips" role="group" aria-label={KIND_LABELS[kind]}>
                        {data.standings
                          .filter((t) => t.kind === kind)
                          .map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              className="chip"
                              aria-pressed={current.id === t.id}
                              onClick={() => setParams({ t: t.id }, { replace: true })}
                            >
                              {t.title}
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
              <Table table={current} data={data} />
              {current.rounds.length > 0 && (
                <>
                  <p className="dtm-legend small">
                    {LEGEND.map(([tone, label]) => (
                      <span className="dtm-legend__item" key={tone}>
                        <span className={`dtm-result dtm-result--${tone}`} aria-hidden="true">
                          ·
                        </span>
                        {label}
                      </span>
                    ))}
                  </p>
                  <PlacesSection key={`${season}:${current.id}`} table={current} seriesId="dtm" />
                </>
              )}
              <DtmSourceNote />
            </>
          );
        }}
      </DataState>
    </section>
  );
}

function Table({ table, data }: { table: StandingTable; data: DtmSeasonData }) {
  // Race page behind each column, when the columns line up with the season's races.
  const raceAt = new Map(
    data.races.flatMap((race) => {
      const column = raceColumn(data, table, race);
      return column === null ? [] : [[column, race] as const];
    }),
  );
  return (
    <>
      <h2 className="section-title">{table.title}</h2>
      <div className="table-wrap dtm-standings-scroll">
        <table className="table dtm-standings">
          <caption className="visually-hidden">{table.title}</caption>
          <thead>
            <tr>
              <th scope="col" className="align-center">
                Поз.
              </th>
              <th scope="col">
                {table.kind === 'drivers' ? 'Пилот' : table.kind === 'teams' ? 'Команда' : 'Производитель'}
              </th>
              {table.rounds.map((column, i) => {
                const race = raceAt.get(i);
                return (
                  <th key={`${column.abbr}-${i}`} scope="col" className="align-center dtm-standings__round">
                    {race ? (
                      <Link to={`/dtm/${data.id}/race/${race.index}`} title={`Гонка ${race.index}`}>
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
                        <DtmName who={row.name} emblem={table.kind !== 'drivers'} />
                      </td>
                    </>
                  )}
                  {table.rounds.map((_, i) => (
                    <td key={i} className="align-center dtm-standings__cell">
                      <DtmResult cell={line[i]} />
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
