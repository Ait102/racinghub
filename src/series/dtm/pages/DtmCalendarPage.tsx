import { useState } from 'react';
import { Link } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { ScheduleMoment } from '../../../components/WeekendSchedule';
import { useNow } from '../../../hooks/useNow';
import { dtmRaceStart } from '../data/schedule';
import { DTM_STATUS_LABELS, dtmRaceStatus, nextDtmRace, type DtmStatus } from '../domain/season';
import { useDtmSeason } from '../hooks/data';
import { DTM_EMPTY, DtmGuard, DtmName, DtmSourceNote, DtmStatusBadge, raceLabel } from './common';

const ORDER: DtmStatus[] = ['completed', 'live', 'upcoming', 'awaiting', 'cancelled', 'unknown'];

export function DtmCalendarPage() {
  return <DtmGuard>{(season) => <Calendar key={season} season={season} />}</DtmGuard>;
}

function Calendar({ season }: { season: string }) {
  const res = useDtmSeason(season);
  const now = useNow(60_000);
  const [filter, setFilter] = useState<'all' | DtmStatus>('all');
  return (
    <section className="page">
      <PageHeader eyebrow={`DTM ${season}`} title="Календарь">
        <p className="lead">Гонки как у источника: на этапе обычно две, в субботу и в воскресенье.</p>
      </PageHeader>
      <DataState
        state={res}
        isEmpty={(data) => data.races.length === 0}
        emptyText={DTM_EMPTY(res.status === 'success' ? res.data.unavailable : false)}
      >
        {(data) => {
          const races = data.races.map((race) => ({ race, status: dtmRaceStatus(race, now) }));
          const next = nextDtmRace(data.races, now);
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
                    {s === 'all' ? 'Все' : DTM_STATUS_LABELS[s]}{' '}
                    <span className="chip__count">
                      {s === 'all' ? races.length : races.filter((r) => r.status === s).length}
                    </span>
                  </button>
                ))}
              </div>
              <ol className="race-grid">
                {shown.map(({ race, status }) => (
                  <li key={race.index}>
                    <Link
                      to={`/dtm/${season}/race/${race.index}`}
                      className={`race-card race-card--${status}${next?.index === race.index ? ' race-card--next' : ''}`}
                    >
                      {next?.index === race.index && <span className="race-card__next">Следующая</span>}
                      <span className="race-card__top">
                        <span className="race-card__round">{raceLabel(race)}</span>
                        <span className="race-card__badges">
                          <DtmStatusBadge status={status} />
                        </span>
                      </span>
                      <span className="race-card__name">{race.circuit?.name ?? 'Трасса не указана'}</span>
                      <span className="race-card__date">
                        {dtmRaceStart(season, race) ? (
                          <ScheduleMoment start={dtmRaceStart(season, race)!} />
                        ) : (
                          race.dateText || '—'
                        )}
                      </span>
                      {race.note && <span className="muted small">{race.note}</span>}
                      {race.winner && (
                        <span className="race-card__winner">
                          Победитель: <DtmName who={{ ...race.winner, article: null }} />
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ol>
              <DtmSourceNote />
            </>
          );
        }}
      </DataState>
    </section>
  );
}
