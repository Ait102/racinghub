import { useState } from 'react';
import { Link } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { ScheduleMoment } from '../../../components/WeekendSchedule';
import { useNow } from '../../../hooks/useNow';
import { imsaRaceStart } from '../data/schedule';
import { IMSA_STATUS_LABELS, imsaRaceStatus, nextImsaRace, type ImsaStatus } from '../domain/season';
import { useImsaSeason } from '../hooks/data';
import { ClassTag, IMSA_EMPTY, ImsaGuard, ImsaSourceNote, ImsaStatusBadge } from './common';

const ORDER: ImsaStatus[] = ['completed', 'live', 'upcoming', 'awaiting', 'unknown'];

export function ImsaCalendarPage() {
  return <ImsaGuard>{(season) => <Calendar key={season} season={season} />}</ImsaGuard>;
}

function Calendar({ season }: { season: string }) {
  const res = useImsaSeason(season);
  const now = useNow(60_000);
  const [filter, setFilter] = useState<'all' | ImsaStatus>('all');
  return (
    <section className="page">
      <PageHeader eyebrow={`IMSA ${season}`} title="Календарь">
        <p className="lead">Не все классы едут каждую гонку: состав классов — как в расписании источника.</p>
      </PageHeader>
      <DataState
        state={res}
        isEmpty={(data) => data.races.length === 0}
        emptyText={IMSA_EMPTY(res.status === 'success' ? res.data.unavailable : false)}
      >
        {(data) => {
          const races = data.races.map((race) => ({ race, status: imsaRaceStatus(race, now) }));
          const next = nextImsaRace(data.races, now);
          const statuses = ORDER.filter((s) => races.some((r) => r.status === s));
          const shown = filter === 'all' ? races : races.filter((r) => r.status === filter);
          return (
            <>
              <div className="chips" role="group" aria-label="Фильтр по статусу">
                {(['all', ...statuses] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chip"
                    aria-pressed={filter === s}
                    onClick={() => setFilter(s)}
                  >
                    {s === 'all' ? 'Все' : IMSA_STATUS_LABELS[s]}{' '}
                    <span className="chip__count">
                      {s === 'all' ? races.length : races.filter((r) => r.status === s).length}
                    </span>
                  </button>
                ))}
              </div>
              <ol className="race-grid">
                {shown.map(({ race, status }) => (
                  <li key={race.round}>
                    <Link
                      to={`/imsa/${season}/race/${race.round}`}
                      className={`race-card race-card--${status}${next?.round === race.round ? ' race-card--next' : ''}`}
                    >
                      {next?.round === race.round && <span className="race-card__next">Следующая</span>}
                      <span className="race-card__top">
                        <span className="race-card__round">Этап {race.round}</span>
                        <span className="race-card__badges">
                          <ImsaStatusBadge status={status} />
                        </span>
                      </span>
                      <span className="race-card__name">{race.name}</span>
                      <span className="race-card__place">{race.circuit?.name ?? 'Трасса не указана'}</span>
                      <span className="race-card__date">
                        {imsaRaceStart(season, race.round) ? (
                          <ScheduleMoment start={imsaRaceStart(season, race.round)!} />
                        ) : (
                          race.dateText || '—'
                        )}
                        {race.length && ` · ${race.length}`}
                      </span>
                      <span className="imsa-class-list">
                        {race.winners.length
                          ? race.winners.map((w) => <ClassTag key={w.cls} cls={w.cls} />)
                          : race.classes && <span className="muted small">Классы: {race.classes}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
              <ImsaSourceNote />
            </>
          );
        }}
      </DataState>
    </section>
  );
}
