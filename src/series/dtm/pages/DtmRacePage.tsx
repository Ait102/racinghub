import { Link, useParams } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { SeriesCircuitMap } from '../../../components/SeriesCircuitMap';
import { SessionResults } from '../../../components/SessionResults';
import { WeekendSchedule } from '../../../components/WeekendSchedule';
import { useNow } from '../../../hooks/useNow';
import { dtmWeekendSchedule } from '../data/schedule';
import { dtmRaceStatus, raceResults, type DtmRace } from '../domain/season';
import { useDtmSeason, useDtmSessions } from '../hooks/data';
import {
  CountryFlag,
  DtmGuard,
  DtmName,
  DtmResult,
  DtmSourceNote,
  DtmStatusBadge,
  raceLabel,
} from './common';

export function DtmRacePage() {
  return <DtmGuard>{(season) => <Race season={season} />}</DtmGuard>;
}

function Race({ season }: { season: string }) {
  const { index = '' } = useParams();
  const res = useDtmSeason(season);
  const now = useNow(60_000);
  return (
    <section className="page">
      <DataState state={res}>
        {(data) => {
          const race = data.races.find((r) => String(r.index) === index);
          if (!race)
            return (
              <>
                <h1>Такой гонки в сезоне нет</h1>
                <Link to={`/dtm/${season}/calendar`}>Календарь сезона</Link>
              </>
            );
          const prev = data.races[race.index - 2];
          const next = data.races[race.index];
          const results = raceResults(data, race);
          return (
            <>
              <PageHeader
                eyebrow={`DTM ${season} · ${raceLabel(race)}`}
                title={race.circuit?.name ?? 'Гонка'}
              >
                <p className="lead">
                  <CountryFlag country={race.circuit?.flag?.country} /> {race.circuit?.flag?.country ?? ''} ·{' '}
                  {race.dateText || 'Дата не указана'} <DtmStatusBadge status={dtmRaceStatus(race, now)} />
                </p>
              </PageHeader>
              {race.note && <p className="notice">{race.note}</p>}
              {dtmWeekendSchedule(season, race.round) && (
                <WeekendSchedule schedule={dtmWeekendSchedule(season, race.round)!} />
              )}
              {Number(season) >= 2023 && (
                <SeriesCircuitMap
                  names={[race.circuit?.article, race.circuit?.name]}
                  title={race.circuit?.name ?? null}
                />
              )}
              <dl className="dtm-facts dtm-facts--row card">
                <div>
                  <dt>Трасса</dt>
                  <dd>
                    <DtmName who={race.circuit} kind="circuit" />
                  </dd>
                </div>
                <div>
                  <dt>Победитель</dt>
                  <dd>
                    <DtmName who={race.winner} strong kind="driver" />
                  </dd>
                </div>
                <div>
                  <dt>Команда</dt>
                  <dd>
                    <DtmName who={race.winningTeam} kind="team" />
                  </dd>
                </div>
                <div>
                  <dt>Марка</dt>
                  <dd>
                    <DtmName who={race.winningManufacturer} emblem />
                  </dd>
                </div>
                <div>
                  <dt>Поул</dt>
                  <dd>
                    <DtmName who={race.pole} kind="driver" />
                  </dd>
                </div>
                <div>
                  <dt>Быстрый круг</dt>
                  <dd>
                    <DtmName who={race.fastestLap} kind="driver" />
                  </dd>
                </div>
              </dl>
              <h2 className="section-title">Результаты</h2>
              {results && results.length > 0 ? (
                <>
                  <p className="muted small">
                    Места из личного зачёта источника. Надстрочная цифра — очки за квалификацию, как в таблице
                    источника.
                  </p>
                  <div className="table-wrap">
                    <table className="table dtm-race-table">
                      <caption className="visually-hidden">Результаты гонки</caption>
                      <thead>
                        <tr>
                          <th scope="col" className="align-center">
                            Место
                          </th>
                          <th scope="col">Пилот</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r) => (
                          <tr key={r.driver.name}>
                            <td className="align-center">
                              <DtmResult cell={r.cell} />
                            </td>
                            <td>
                              <DtmName who={r.driver} kind="driver" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="muted">
                  {race.note ? 'Гонка не состоялась.' : 'Результатов этой гонки у источника пока нет.'}
                </p>
              )}
              <EventSessions season={season} race={race} />
              <nav className="dtm-home-actions" aria-label="Соседние гонки">
                {prev && (
                  <Link className="btn btn--ghost btn--small" to={`/dtm/${season}/race/${prev.index}`}>
                    ← {raceLabel(prev)}
                  </Link>
                )}
                <Link className="btn btn--ghost btn--small" to={`/dtm/${season}/calendar`}>
                  Календарь
                </Link>
                {next && (
                  <Link className="btn btn--ghost btn--small" to={`/dtm/${season}/race/${next.index}`}>
                    {raceLabel(next)} →
                  </Link>
                )}
              </nav>
              <DtmSourceNote />
            </>
          );
        }}
      </DataState>
    </section>
  );
}

/** Practice, qualifying and races of the event from the official DTM results. */
function EventSessions({ season, race }: { season: string; race: DtmRace }) {
  const res = useDtmSessions(season);
  if (res.status !== 'success') return null;
  const sessions = res.data.filter((x) => x.round === race.round);
  if (!sessions.length) return null;
  return (
    <SessionResults
      sessions={sessions.map((x) => ({
        key: String(x.order),
        label: x.label,
        start: x.start,
        rows: x.rows.map((r) => ({
          pos: r.pos,
          posText: r.status && r.pos === null ? r.status : undefined,
          number: r.number,
          drivers: [r.driver],
          team: r.team,
          car: r.car,
          time: r.time,
          gap: r.gap,
          laps: r.laps,
          bestLap: r.bestLap,
          points: x.kind === 'race' ? r.points : null,
        })),
      }))}
      initial={String(sessions.find((x) => x.name === `Race ${race.race ?? 1}`)?.order ?? '')}
      source={
        <>
          Официальные результаты DTM (
          <a href="https://www.dtm.com/en/results" target="_blank" rel="noreferrer">
            dtm.com
          </a>
          ): время, отставание, круги и очки — как у источника.
        </>
      }
    />
  );
}
