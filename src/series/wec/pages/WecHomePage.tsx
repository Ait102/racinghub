import { Link } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { useNow } from '../../../hooks/useNow';
import { ClassBadge, Crew, NameFlag, WecStatusBadge, WikiFlagImg, WikiSourceNote } from '../components/bits';
import { seasonLabel } from '../data/seasons';
import { daysUntil, lastCompleted, nextRound, roundStatus } from '../domain/status';
import type { StandingTable, WecRound, WecSeasonData } from '../domain/types';
import { useWecSeason } from '../hooks/data';
import { WecGuard } from './common';

/** Season overview: next race, last winners by class, championship leaders. */
export function WecHomePage() {
  return <WecGuard>{(season) => <Overview season={season} />}</WecGuard>;
}

function Overview({ season }: { season: string }) {
  const res = useWecSeason(season);
  const now = useNow(60_000);
  return (
    <section className="page">
      <PageHeader eyebrow="FIA World Endurance Championship" title={`WEC ${seasonLabel(season)}`}>
        {res.status === 'success' && (
          <p className="lead">
            {res.data.rounds.length} этапов · классы: {res.data.classes.join(', ') || '—'}
          </p>
        )}
      </PageHeader>
      <DataState
        state={res}
        isEmpty={(d) => d.rounds.length === 0}
        emptyText="У источника нет календаря этого сезона."
      >
        {(data) => (
          <>
            <NextRace data={data} now={now} />
            <div className="grid-2">
              <LastRace data={data} />
              <Leaders season={season} tables={data.standings} />
            </div>
            <WikiSourceNote />
          </>
        )}
      </DataState>
    </section>
  );
}

function place(r: WecRound) {
  return [r.circuit?.name, r.location].filter(Boolean).join(' · ') || 'Трасса не указана';
}

function NextRace({ data, now }: { data: WecSeasonData; now: Date }) {
  const next = nextRound(data.rounds, now);
  if (!next) {
    const awaiting = data.rounds.find((r) => roundStatus(r, now) === 'awaiting');
    return (
      <div className="hero">
        <div className="hero__main">
          {awaiting ? (
            <>
              <p className="hero__eyebrow">Этап {awaiting.round}</p>
              <Link to={`/wec/${data.id}/race/${awaiting.round}`} className="hero__name">
                {awaiting.name}
              </Link>
              <p className="muted">Гонка прошла, источник ещё не опубликовал результат.</p>
            </>
          ) : (
            <>
              <p className="hero__eyebrow">Сезон завершён</p>
              <p className="hero__name">Предстоящих этапов нет</p>
            </>
          )}
        </div>
      </div>
    );
  }
  const status = roundStatus(next, now);
  const days = daysUntil(next, now);
  return (
    <div className="hero">
      <div className="hero__inner">
        <div className="hero__main">
          <p className="hero__eyebrow">
            Следующий этап · {next.round} <WecStatusBadge status={status} />
          </p>
          <Link to={`/wec/${data.id}/race/${next.round}`} className="hero__name">
            {next.name}
          </Link>
          <p className="hero__place">
            <WikiFlagImg flag={next.country} />
            {place(next)}
          </p>
          <p className="hero__date">Даты: {next.dateText || '—'}</p>
        </div>
        {status === 'upcoming' && days !== null && days > 0 && (
          <div className="countdown" role="timer" aria-label={`До этапа ${days} дн.`}>
            <div className="countdown__box" aria-hidden="true">
              <span className="countdown__value">{String(days).padStart(2, '0')}</span>
              <span className="countdown__label">{days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LastRace({ data }: { data: WecSeasonData }) {
  const last = lastCompleted(data.rounds);
  return (
    <article className="card">
      <h2 className="card__title">Последняя гонка</h2>
      {!last ? (
        <p className="muted">В этом сезоне ещё не было гонок с опубликованным результатом.</p>
      ) : (
        <>
          <p>
            <Link to={`/wec/${data.id}/race/${last.round}`}>
              <strong>{last.name}</strong>
            </Link>{' '}
            <span className="muted">· этап {last.round}</span>
          </p>
          <ul className="winners">
            {last.winners.map((w) => (
              <li key={w.cls} className="winners__item">
                <ClassBadge cls={w.cls} />
                <span className="winners__team">
                  {w.number && <span className="car-no">#{w.number}</span>} <NameFlag who={w.team} strong />
                </span>
                <Crew drivers={w.drivers} />
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

/** First drivers' and manufacturers'/teams' table of each kind, top three. */
function Leaders({ season, tables }: { season: string; tables: StandingTable[] }) {
  const shown = tables.slice(0, 4);
  return (
    <article className="card">
      <h2 className="card__title">Лидеры зачётов</h2>
      {shown.length === 0 ? (
        <p className="muted">Зачётов у источника пока нет.</p>
      ) : (
        <div className="wec-leaders">
          {shown.map((t) => (
            <div key={t.id} className="wec-leaders__table">
              <Link to={`/wec/${season}/standings?t=${t.id}`} className="wec-leaders__title">
                {t.title}
              </Link>
              <ol className="wec-leaders__list">
                {t.rows.slice(0, 3).map((r, i) => (
                  <li key={`${r.name.name}-${i}`}>
                    <span className="wec-leaders__pos">{r.posText}</span>
                    <NameFlag who={r.name} />
                    <span className="wec-leaders__pts">{r.points}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
      <p>
        <Link to={`/wec/${season}/standings`}>Все зачёты →</Link>
      </p>
    </article>
  );
}
