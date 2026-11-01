import { useState } from 'react';
import { Link } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { useNow } from '../../../hooks/useNow';
import { ClassBadge, NameFlag, WecStatusBadge, WikiFlagImg, WikiSourceNote } from '../components/bits';
import { seasonLabel } from '../data/seasons';
import { isLeMans, nextRound, roundStatus, WEC_STATUS_LABELS, type WecStatus } from '../domain/status';
import { useWecSeason } from '../hooks/data';
import { WecGuard } from './common';

type Filter = 'all' | WecStatus;

export function WecCalendarPage() {
  return <WecGuard>{(season) => <Calendar season={season} />}</WecGuard>;
}

function Calendar({ season }: { season: string }) {
  const res = useWecSeason(season);
  const now = useNow(60_000);
  const [filter, setFilter] = useState<Filter>('all');

  return (
    <section className="page">
      <PageHeader eyebrow={`WEC ${seasonLabel(season)}`} title="Календарь" />
      <DataState
        state={res}
        isEmpty={(d) => d.rounds.length === 0}
        emptyText="У источника нет календаря этого сезона."
      >
        {(data) => {
          const withStatus = data.rounds.map((r) => ({ r, status: roundStatus(r, now) }));
          const next = nextRound(data.rounds, now);
          const statuses = (['completed', 'live', 'upcoming', 'awaiting'] as WecStatus[]).filter((s) =>
            withStatus.some((x) => x.status === s),
          );
          const shown = filter === 'all' ? withStatus : withStatus.filter((x) => x.status === filter);
          return (
            <>
              <div className="chips" role="group" aria-label="Фильтр по статусу">
                {(['all', ...statuses] as Filter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    className="chip"
                    aria-pressed={filter === f}
                    onClick={() => setFilter(f)}
                  >
                    {f === 'all' ? 'Все' : WEC_STATUS_LABELS[f]}{' '}
                    <span className="chip__count">
                      {f === 'all' ? withStatus.length : withStatus.filter((x) => x.status === f).length}
                    </span>
                  </button>
                ))}
              </div>
              <ol className="race-grid">
                {shown.map(({ r, status }) => (
                  <li key={r.round} className="wec-calendar-item">
                    <Link
                      to={`/wec/${season}/race/${r.round}`}
                      className={`race-card race-card--${status}${next?.round === r.round ? ' race-card--next' : ''}${isLeMans(r) ? ' race-card--lemans' : ''}`}
                      data-round={r.round}
                    >
                      {next?.round === r.round && <span className="race-card__next">Следующий</span>}
                      <span className="race-card__top">
                        <span className="race-card__round">Этап {r.round}</span>
                        <span className="race-card__badges">
                          {isLeMans(r) && <span className="lemans-badge">24 часа</span>}
                          <WecStatusBadge status={status} />
                        </span>
                      </span>
                      <span className="race-card__name">{r.name}</span>
                      <span className="race-card__place">
                        <WikiFlagImg flag={r.country} />
                        {r.location ?? 'Место не указано'}
                      </span>
                      <span className="race-card__circuit muted">{r.circuit?.name ?? ''}</span>
                      <span className="race-card__date">{r.dateText || '—'}</span>
                      {r.winners.length > 0 && (
                        <span className="race-card__winners">
                          {r.winners.map((w) => (
                            <span key={w.cls} className="race-card__winner">
                              <ClassBadge cls={w.cls} /> <NameFlag who={w.team} link={false} />
                            </span>
                          ))}
                        </span>
                      )}
                    </Link>
                    <div className="wec-calendar-profiles">
                      {(r.eventArticle ?? r.circuit?.article) && (
                        <Link
                          to={`/wec/${season}/circuit/${encodeURIComponent((r.eventArticle ?? r.circuit?.article)!)}${r.circuit?.article ? `?circuit=${encodeURIComponent(r.circuit.article)}` : ''}`}
                        >
                          История · {r.circuit?.name ?? r.name}
                        </Link>
                      )}
                      {r.winners.map((w) => (
                        <NameFlag key={w.cls} who={w.team} />
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
              {data.cancelled.length > 0 && (
                <>
                  <h2 className="section-title">Отменённые и перенесённые гонки</h2>
                  <ul className="cancelled">
                    {data.cancelled.map((c) => (
                      <li key={c.name}>
                        <strong>{c.name}</strong>{' '}
                        <span className="muted">
                          · {c.circuit?.name ?? '—'} · {c.dateText}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <WikiSourceNote />
            </>
          );
        }}
      </DataState>
    </section>
  );
}
