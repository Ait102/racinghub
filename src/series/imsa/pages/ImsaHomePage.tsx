import { Link } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { posClass } from '../../../components/ui';
import { useNow } from '../../../hooks/useNow';
import {
  daysUntilImsa,
  imsaRaceStatus,
  lastImsaRace,
  nextImsaRace,
  seasonClasses,
  type ImsaSeasonData,
} from '../domain/season';
import { useImsaSeason } from '../hooks/data';
import {
  ClassTag,
  IMSA_EMPTY,
  ImsaGuard,
  ImsaName,
  ImsaRowName,
  ImsaSourceNote,
  ImsaStatusBadge,
} from './common';

export function ImsaHomePage() {
  return <ImsaGuard>{(season) => <Overview season={season} />}</ImsaGuard>;
}

function Overview({ season }: { season: string }) {
  const res = useImsaSeason(season);
  const now = useNow(60_000);
  const races = res.status === 'success' ? res.data.races : [];
  const done = races.filter((r) => r.winners.length).length;
  return (
    <section className="page imsa-home">
      <PageHeader eyebrow="IMSA SportsCar Championship" title={`IMSA ${season}`}>
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
        emptyText={IMSA_EMPTY(res.status === 'success' ? res.data.unavailable : false)}
      >
        {(data) => (
          <>
            <NextRace data={data} now={now} />
            <div className="imsa-home-grid">
              <LastRace data={data} />
              <Leaders data={data} />
            </div>
            <ImsaSourceNote />
          </>
        )}
      </DataState>
    </section>
  );
}

function NextRace({ data, now }: { data: ImsaSeasonData; now: Date }) {
  const next = nextImsaRace(data.races, now);
  if (!next) {
    const awaiting = data.races.find((r) => imsaRaceStatus(r, now) === 'awaiting');
    return (
      <div className="hero">
        <div className="hero__main">
          <p className="hero__eyebrow">{awaiting ? 'Ждём результаты' : 'Предстоящих гонок нет'}</p>
          {awaiting ? (
            <Link className="hero__name" to={`/imsa/${data.id}/race/${awaiting.round}`}>
              {awaiting.name}
            </Link>
          ) : (
            <p className="hero__name">
              {data.races.every((r) => r.winners.length) ? 'Сезон завершён' : 'У источника нет дат гонок'}
            </p>
          )}
        </div>
      </div>
    );
  }
  const status = imsaRaceStatus(next, now);
  const days = daysUntilImsa(next, now);
  return (
    <div className="hero">
      <div className="hero__inner">
        <div className="hero__main">
          <p className="hero__eyebrow">
            Следующая гонка · этап {next.round} <ImsaStatusBadge status={status} />
          </p>
          <Link className="hero__name" to={`/imsa/${data.id}/race/${next.round}`}>
            {next.name}
          </Link>
          <p className="hero__place">{next.circuit?.name ?? 'Трасса не указана'}</p>
          <p className="hero__date">
            Дата: {next.dateText || '—'} · {next.length || 'длительность не указана'} · классы:{' '}
            {next.classes || '—'}
          </p>
          <div className="imsa-home-actions">
            <Link className="btn btn--ghost btn--small" to={`/imsa/${data.id}/calendar`}>
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

function LastRace({ data }: { data: ImsaSeasonData }) {
  const last = lastImsaRace(data.races);
  return (
    <article className="card imsa-home-last">
      <h2 className="card__title">Последняя гонка</h2>
      {!last ? (
        <p className="muted">В этом сезоне ещё нет опубликованных победителей.</p>
      ) : (
        <>
          <p className="imsa-home-last__name">
            <Link to={`/imsa/${data.id}/race/${last.round}`}>
              <strong>{last.name}</strong>
            </Link>{' '}
            <span className="muted">· этап {last.round}</span>
          </p>
          <ul className="imsa-winners">
            {last.winners.map((w) => (
              <li key={w.cls}>
                <ClassTag cls={w.cls} />
                <span>
                  <ImsaName who={w.team} strong kind="team" />
                  <span className="muted small"> {w.drivers.map((d) => d.name).join(', ')}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

function Leaders({ data }: { data: ImsaSeasonData }) {
  const tables = seasonClasses(data).flatMap(
    (cls) => data.standings.find((t) => t.cls === cls && t.kind === 'drivers') ?? [],
  );
  if (tables.length === 0) return <p className="muted">Зачётов у источника пока нет.</p>;
  return (
    <article className="card" aria-label="Лидеры классов">
      <h2 className="card__title">Лидеры классов</h2>
      {tables.map((table) => (
        <div key={table.id} className="imsa-leaders">
          <ClassTag cls={table.cls} />
          <ol className="imsa-leaders__list">
            {table.rows.slice(0, 3).map((row, i) => (
              <li key={`${row.name.name}-${i}`}>
                <span className={posClass('imsa-leaders__pos', row.pos)}>{row.posText}</span>
                <ImsaRowName row={row} kind="driver" />
                <span className="imsa-leaders__pts">{row.points || '—'}</span>
              </li>
            ))}
          </ol>
        </div>
      ))}
      <Link className="card__more" to={`/imsa/${data.id}/standings`}>
        Все зачёты →
      </Link>
    </article>
  );
}
