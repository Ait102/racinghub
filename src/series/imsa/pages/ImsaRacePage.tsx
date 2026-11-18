import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { SeriesCircuitMap } from '../../../components/SeriesCircuitMap';
import { WeekendSchedule } from '../../../components/WeekendSchedule';
import { useNow } from '../../../hooks/useNow';
import { imsaWeekendSchedule } from '../data/schedule';
import { imsaRaceStatus, type ImsaRace } from '../domain/season';
import { useImsaRace, useImsaSeason } from '../hooks/data';
import { ClassTag, ImsaGuard, ImsaName, ImsaSourceNote, ImsaStatusBadge } from './common';

export function ImsaRacePage() {
  return <ImsaGuard>{(season) => <Race season={season} />}</ImsaGuard>;
}

function Race({ season }: { season: string }) {
  const { round = '' } = useParams();
  const res = useImsaSeason(season);
  const now = useNow(60_000);
  return (
    <section className="page">
      <DataState state={res}>
        {(data) => {
          const race = data.races.find((r) => String(r.round) === round);
          if (!race)
            return (
              <>
                <h1>Такой гонки в сезоне нет</h1>
                <Link to={`/imsa/${season}/calendar`}>Календарь сезона</Link>
              </>
            );
          const prev = data.races.find((r) => r.round === race.round - 1);
          const next = data.races.find((r) => r.round === race.round + 1);
          return (
            <>
              <PageHeader eyebrow={`IMSA ${season} · этап ${race.round}`} title={race.name}>
                <p className="lead">
                  {race.dateText || 'Дата не указана'} <ImsaStatusBadge status={imsaRaceStatus(race, now)} />
                </p>
              </PageHeader>
              {imsaWeekendSchedule(season, race.round) && (
                <WeekendSchedule schedule={imsaWeekendSchedule(season, race.round)!} />
              )}
              {Number(season) >= 2023 && (
                <SeriesCircuitMap
                  names={[race.circuit?.article, race.circuit?.name]}
                  title={race.circuit?.name ?? null}
                />
              )}
              <dl className="imsa-facts card">
                <div>
                  <dt>Трасса</dt>
                  <dd>
                    <ImsaName who={race.circuit} kind="circuit" />
                  </dd>
                </div>
                <div>
                  <dt>Место</dt>
                  <dd>{race.location || '—'}</dd>
                </div>
                <div>
                  <dt>Длительность</dt>
                  <dd>{race.length || '—'}</dd>
                </div>
                <div>
                  <dt>Классы</dt>
                  <dd>{race.classes || '—'}</dd>
                </div>
              </dl>
              {race.winners.length > 0 && (
                <>
                  <h2 className="section-title">Победители классов</h2>
                  <ul className="imsa-winners imsa-winners--wide">
                    {race.winners.map((w) => (
                      <li key={w.cls} className="card">
                        <ClassTag cls={w.cls} />
                        <span>
                          <ImsaName who={w.team} strong kind="team" />
                          <span className="imsa-winners__drivers">
                            {w.drivers.map((d) => (
                              <ImsaName key={d.name} who={d} kind="driver" />
                            ))}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <Classification season={season} race={race} />
              <nav className="imsa-home-actions" aria-label="Соседние гонки">
                {prev && (
                  <Link className="btn btn--ghost btn--small" to={`/imsa/${season}/race/${prev.round}`}>
                    ← {prev.name}
                  </Link>
                )}
                <Link className="btn btn--ghost btn--small" to={`/imsa/${season}/calendar`}>
                  Календарь
                </Link>
                {next && (
                  <Link className="btn btn--ghost btn--small" to={`/imsa/${season}/race/${next.round}`}>
                    {next.name} →
                  </Link>
                )}
              </nav>
              <ImsaSourceNote />
            </>
          );
        }}
      </DataState>
    </section>
  );
}

function Classification({ season, race }: { season: string; race: ImsaRace }) {
  const res = useImsaRace(season, race.report);
  const [cls, setCls] = useState<string | null>(null);
  if (!race.report) return null;
  return (
    <>
      <h2 className="section-title">Протокол гонки</h2>
      <DataState
        state={res}
        isEmpty={(data) => data.rows.length === 0}
        emptyText="В статье гонки пока нет протокола."
      >
        {(data) => {
          const classes = [...new Set(data.rows.map((r) => r.cls))];
          const rows = cls ? data.rows.filter((r) => r.cls === cls) : data.rows;
          const hasPic = data.rows.some((r) => r.pic);
          return (
            <>
              <div className="chips" role="group" aria-label="Класс">
                {[null, ...classes].map((c) => (
                  <button
                    key={c ?? 'all'}
                    type="button"
                    className="chip"
                    aria-pressed={cls === c}
                    onClick={() => setCls(c)}
                  >
                    {c ?? 'Все классы'}
                  </button>
                ))}
              </div>
              <div className="table-wrap">
                <table className="table imsa-results">
                  <caption className="visually-hidden">Протокол гонки</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="align-center">
                        Поз.
                      </th>
                      <th scope="col">Класс</th>
                      {hasPic && (
                        <th scope="col" className="align-center" title="Место в классе">
                          В классе
                        </th>
                      )}
                      <th scope="col" className="align-center">
                        №
                      </th>
                      <th scope="col">Команда и пилоты</th>
                      <th scope="col">Машина</th>
                      <th scope="col" className="align-right">
                        Круги
                      </th>
                      <th scope="col" className="align-right">
                        Время / сход
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={`${r.number}-${r.posText}`} className={r.status ? 'is-retired' : undefined}>
                        <td className="align-center">
                          <strong>{r.pos ?? r.posText}</strong>
                          {r.status && <span className="muted small"> {r.status}</span>}
                        </td>
                        <td>
                          <ClassTag cls={r.cls} />
                        </td>
                        {hasPic && <td className="align-center">{r.pic ?? '—'}</td>}
                        <td className="align-center">{r.number}</td>
                        <td>
                          <ImsaName who={r.team} strong kind="team" />
                          <span className="imsa-winners__drivers">
                            {r.drivers.map((d) => (
                              <ImsaName key={d.name} who={d} kind="driver" />
                            ))}
                          </span>
                        </td>
                        <td>
                          {r.chassis}
                          {r.engine && <span className="muted small imsa-results__engine">{r.engine}</span>}
                        </td>
                        <td className="align-right">{r.laps}</td>
                        <td className="align-right">{r.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          );
        }}
      </DataState>
    </>
  );
}
