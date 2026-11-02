import { useState } from 'react';
import { Link } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { useNow } from '../../../hooks/useNow';
import { FeStatusBadge, NameFlag, WikiFlagImg, WikiSourceNote } from '../components/bits';
import { seasonLabel } from '../data/seasons';
import { FE_STATUS_LABELS, nextRound, roundStatus, type FeStatus } from '../domain/status';
import { useFeSeason } from '../hooks/data';
import { FeGuard } from './common';

export function FeCalendarPage() {
  return <FeGuard>{(season) => <Calendar key={season} season={season} />}</FeGuard>;
}

function Calendar({ season }: { season: string }) {
  const res = useFeSeason(season);
  const now = useNow(60_000);
  const [filter, setFilter] = useState<'all' | FeStatus>('all');
  return (
    <section className="page">
      <PageHeader eyebrow={`Formula E ${seasonLabel(season)}`} title="Календарь" />
      <DataState
        state={res}
        isEmpty={(data) => data.rounds.length === 0}
        emptyText={
          res.status === 'success' && res.data.unavailable
            ? 'Статья сезона ещё не опубликована в Википедии.'
            : 'У источника пока нет календаря этого сезона.'
        }
      >
        {(data) => {
          const rounds = data.rounds.map((r) => ({ r, status: roundStatus(r, now) }));
          const next = nextRound(data.rounds, now);
          const statuses = (['completed', 'live', 'upcoming', 'awaiting', 'unknown'] as FeStatus[]).filter(
            (status) => rounds.some((r) => r.status === status),
          );
          const shown = filter === 'all' ? rounds : rounds.filter((r) => r.status === filter);
          return (
            <>
              <div className="chips" role="group" aria-label="Фильтр по статусу">
                {(['all', ...statuses] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    className="chip"
                    aria-pressed={filter === status}
                    onClick={() => setFilter(status)}
                  >
                    {status === 'all' ? 'Все' : FE_STATUS_LABELS[status]}{' '}
                    <span className="chip__count">
                      {status === 'all' ? rounds.length : rounds.filter((r) => r.status === status).length}
                    </span>
                  </button>
                ))}
              </div>
              <ol className="race-grid">
                {shown.map(({ r, status }) => (
                  <li key={r.round} className="fe-calendar-item">
                    <Link
                      to={`/fe/${season}/race/${r.round}`}
                      className={`race-card race-card--${status}${next?.round === r.round ? ' race-card--next' : ''}`}
                      data-round={r.round}
                    >
                      {next?.round === r.round && <span className="race-card__next">Следующий</span>}
                      <span className="race-card__top">
                        <span className="race-card__round">Этап {r.round}</span>
                        <span className="race-card__badges">
                          <FeStatusBadge status={status} />
                        </span>
                      </span>
                      <span className="race-card__name">{r.name}</span>
                      <span className="race-card__place">
                        <WikiFlagImg flag={r.country} />
                        {r.circuit?.name ?? r.country?.country ?? 'Трасса не указана'}
                      </span>
                      <span className="race-card__date">{r.dateText || '—'}</span>
                      {r.raceNumber !== null && (
                        <span className="fe-double-badge">Сдвоенный этап · гонка {r.raceNumber}</span>
                      )}
                      {r.winner && (
                        <span className="race-card__winner">
                          Победитель: <NameFlag who={r.winner} link={false} />
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ol>
              <WikiSourceNote />
            </>
          );
        }}
      </DataState>
    </section>
  );
}
