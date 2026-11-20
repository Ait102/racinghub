import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { leaderShare, posClass } from '../../../components/ui';
import { useNow } from '../../../hooks/useNow';
import {
  daysUntilDtm,
  dtmRaceStatus,
  lastDtmRace,
  nextDtmRace,
  raceResults,
  type DtmSeasonData,
} from '../domain/season';
import { useDtmSeason, useDtmTeamCars } from '../hooks/data';
import {
  CountryFlag,
  DTM_EMPTY,
  DtmGuard,
  DtmName,
  DtmResult,
  DtmSourceNote,
  DtmStatusBadge,
  raceLabel,
} from './common';

export function DtmHomePage() {
  return <DtmGuard>{(season) => <Overview season={season} />}</DtmGuard>;
}

function Overview({ season }: { season: string }) {
  const res = useDtmSeason(season);
  const now = useNow(60_000);
  const races = res.status === 'success' ? res.data.races : [];
  const done = races.filter((r) => r.winner).length;
  return (
    <section className="page dtm-home">
      <PageHeader eyebrow="Deutsche Tourenwagen Masters" title={`DTM ${season}`}>
        {races.length > 0 && (
          <>
            <p className="lead">
              Проведено гонок: {done} из {races.length}
            </p>
            <div
              className="progress"
              role="progressbar"
              aria-label="Прогресс сезона"
              aria-valuemin={0}
              aria-valuemax={races.length}
              aria-valuenow={done}
            >
              <div className="progress__bar" style={{ width: `${(done / races.length) * 100}%` }} />
            </div>
          </>
        )}
      </PageHeader>
      <DataState
        state={res}
        isEmpty={(data) => data.races.length === 0}
        emptyText={DTM_EMPTY(res.status === 'success' ? res.data.unavailable : false)}
      >
        {(data) => (
          <>
            <NextRace data={data} now={now} />
            <div className="dtm-home-grid">
              <LastRace data={data} />
              <Leaders data={data} />
            </div>
            <DtmSourceNote />
          </>
        )}
      </DataState>
    </section>
  );
}

function NextRace({ data, now }: { data: DtmSeasonData; now: Date }) {
  const next = nextDtmRace(data.races, now);
  if (!next) {
    const awaiting = data.races.find((r) => dtmRaceStatus(r, now) === 'awaiting');
    return (
      <div className="hero">
        <div className="hero__main">
          <p className="hero__eyebrow">{awaiting ? 'Ждём результаты' : 'Предстоящих гонок нет'}</p>
          {awaiting ? (
            <Link className="hero__name" to={`/dtm/${data.id}/race/${awaiting.index}`}>
              {awaiting.circuit?.name ?? raceLabel(awaiting)}
            </Link>
          ) : (
            <p className="hero__name">
              {data.races.every((r) => r.winner || r.note) ? 'Сезон завершён' : 'У источника нет дат гонок'}
            </p>
          )}
        </div>
      </div>
    );
  }
  const status = dtmRaceStatus(next, now);
  const days = daysUntilDtm(next, now);
  return (
    <div className="hero">
      <div className="hero__inner">
        <div className="hero__main">
          <p className="hero__eyebrow">
            Следующая гонка · {raceLabel(next)} <DtmStatusBadge status={status} />
          </p>
          <Link className="hero__name" to={`/dtm/${data.id}/race/${next.index}`}>
            {next.circuit?.name ?? 'Трасса не указана'}
          </Link>
          <p className="hero__place">
            <CountryFlag country={next.circuit?.flag?.country} />
            {next.circuit?.flag?.country ?? ''}
          </p>
          <p className="hero__date">Дата: {next.dateText || '—'}</p>
          <div className="dtm-home-actions">
            <Link className="btn btn--ghost btn--small" to={`/dtm/${data.id}/calendar`}>
              Весь календарь
            </Link>
          </div>
        </div>
        {status === 'upcoming' && days !== null && days > 0 && (
          <div className="countdown" role="timer" aria-label={`До гонки ${days} дн.`}>
            <div className="countdown__box" aria-hidden="true">
              <span className="countdown__value">{days}</span>
              <span className="countdown__label">дн. до гонки</span>
            </div>
            <p className="muted small">Время старта у источника не указано.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LastRace({ data }: { data: DtmSeasonData }) {
  const last = lastDtmRace(data.races);
  const top = last ? (raceResults(data, last)?.slice(0, 3) ?? []) : [];
  return (
    <article className="card">
      <h2 className="card__title">Последняя гонка</h2>
      {!last ? (
        <p className="muted">В этом сезоне ещё нет опубликованного победителя.</p>
      ) : (
        <>
          <p className="dtm-home-last__name">
            <Link to={`/dtm/${data.id}/race/${last.index}`}>
              <strong>{last.circuit?.name ?? raceLabel(last)}</strong>
            </Link>{' '}
            <span className="muted">· {raceLabel(last)}</span>
          </p>
          <dl className="dtm-facts">
            <div>
              <dt>Победитель</dt>
              <dd>
                <DtmName who={last.winner} strong kind="driver" />
              </dd>
            </div>
            <div>
              <dt>Команда</dt>
              <dd>
                <DtmName who={last.winningTeam} kind="team" />
              </dd>
            </div>
            <div>
              <dt>Поул</dt>
              <dd>
                <DtmName who={last.pole} kind="driver" />
              </dd>
            </div>
          </dl>
          {top.length > 0 && (
            <ol className="dtm-leaders" aria-label="Первая тройка">
              {top.map((r) => (
                <li key={r.driver.name}>
                  <DtmResult cell={r.cell} />
                  <DtmName who={r.driver} kind="driver" />
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </article>
  );
}

function Leaders({ data }: { data: DtmSeasonData }) {
  const carsOf = useDtmTeamCars(data.id);
  const shown = ['drivers', 'teams'].flatMap((kind) => data.standings.find((t) => t.kind === kind) ?? []);
  if (shown.length === 0) return <p className="muted">Зачётов у источника пока нет.</p>;
  return (
    <>
      {shown.map((table) => (
        <article className="card" key={table.id} aria-label={table.title}>
          <h2 className="card__title">{table.kind === 'drivers' ? 'Личный зачёт' : 'Командный зачёт'}</h2>
          <ol className="dtm-leaders dtm-leaders--bars">
            {table.rows.slice(0, 5).map((row, i) => (
              <li
                key={`${row.name.name}-${i}`}
                style={
                  { '--bar': `${leaderShare(row.pointsValue, table.rows[0]?.pointsValue)}%` } as CSSProperties
                }
              >
                <span className={posClass('dtm-leaders__pos', row.pos)}>{row.posText}</span>
                <DtmName
                  who={row.name}
                  emblem={table.kind !== 'drivers'}
                  kind={table.kind === 'drivers' ? 'driver' : 'team'}
                  cars={table.kind === 'teams' ? carsOf(row.name) : undefined}
                />
                <span className="dtm-leaders__pts">{row.points || '—'}</span>
              </li>
            ))}
          </ol>
          <Link className="card__more" to={`/dtm/${data.id}/standings?t=${table.id}`}>
            Вся таблица →
          </Link>
        </article>
      ))}
    </>
  );
}
