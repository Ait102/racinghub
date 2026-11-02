import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { leaderShare, posClass } from '../../../components/ui';
import { useNow } from '../../../hooks/useNow';
import {
  ClassBadge,
  classOfTitle,
  Crew,
  NameFlag,
  WecStatusBadge,
  WikiFlagImg,
  WikiSourceNote,
} from '../components/bits';
import { seasonLabel } from '../data/seasons';
import { daysUntil, lastCompleted, nextRound, roundStatus } from '../domain/status';
import type { StandingTable, WecRound, WecSeasonData } from '../domain/types';
import { useWecSeason } from '../hooks/data';
import { useWecFavorites } from '../hooks/favorites';
import { WecGuard } from './common';

/** Season overview: next race, last winners by class, championship leaders. */
export function WecHomePage() {
  return <WecGuard>{(season) => <Overview season={season} />}</WecGuard>;
}

function Overview({ season }: { season: string }) {
  const res = useWecSeason(season);
  const now = useNow(60_000);
  const completed = res.status === 'success' ? res.data.rounds.filter((r) => r.winners.length > 0).length : 0;
  return (
    <section className="page wec-home">
      <PageHeader eyebrow="FIA World Endurance Championship" title={`WEC ${seasonLabel(season)}`}>
        {res.status === 'success' && (
          <>
            <p className="lead">
              Завершено этапов: {completed} из {res.data.rounds.length}
            </p>
            {res.data.rounds.length > 0 && (
              <div
                className="progress"
                role="progressbar"
                aria-label="Прогресс сезона"
                aria-valuemin={0}
                aria-valuemax={res.data.rounds.length}
                aria-valuenow={completed}
              >
                <div
                  className="progress__bar"
                  style={{ width: `${(completed / res.data.rounds.length) * 100}%` }}
                />
              </div>
            )}
            <div className="wec-home-classes" aria-label="Классы сезона">
              {res.data.classes.map((cls) => (
                <ClassBadge key={cls} cls={cls} />
              ))}
            </div>
          </>
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
            <div className="wec-home-grid">
              <LastRace data={data} />
              <Leaders season={season} tables={data.standings} classes={data.classes} />
            </div>
            <Favorites season={season} tables={data.standings} />
            <WikiSourceNote />
          </>
        )}
      </DataState>
    </section>
  );
}

/** Favourites with their first standings row of the season, as the source publishes it. */
function Favorites({ season, tables }: { season: string; tables: StandingTable[] }) {
  const { favs } = useWecFavorites();
  const all = [
    ...favs.drivers.map((article) => ({ article, kind: 'driver' as const })),
    ...favs.teams.map((article) => ({ article, kind: 'team' as const })),
  ];
  if (all.length === 0) {
    return (
      <p className="muted small fav-hint">
        Совет: отметьте пилотов и команды звёздочкой ☆ в их профилях — они появятся здесь и будут выделены в
        списках и зачётах.
      </p>
    );
  }
  return (
    <article className="card">
      <h2 className="card__title">★ Избранное · сезон {seasonLabel(season)}</h2>
      <ul className="wec-leaders__list">
        {all.map(({ article, kind }) => {
          const found = tables
            .filter((t) => (t.kind === 'drivers') === (kind === 'driver'))
            .flatMap((table) => table.rows.map((row) => ({ table, row })))
            .find(({ row }) => row.name.article === article);
          return (
            <li key={`${kind}:${article}`}>
              <span className="wec-leaders__pos">{found?.row.posText || '—'}</span>
              {found ? (
                <NameFlag who={found.row.name} kind={kind} emblem={kind === 'team'} />
              ) : (
                <Link to={`/wec/${season}/${kind}/${encodeURIComponent(article)}`}>{article}</Link>
              )}
              <span className="wec-leaders__pts">
                {found ? (
                  <>
                    {found.row.points || '—'}{' '}
                    <span className="muted small">
                      <Link to={`/wec/${season}/standings?t=${found.table.id}`}>{found.table.title}</Link>
                    </span>
                  </>
                ) : (
                  <span className="muted small">не в зачётах сезона</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </article>
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
          <div className="wec-home-actions">
            <Link className="btn btn--small" to={`/wec/${data.id}/race/${next.round}`}>
              Открыть этап →
            </Link>
            <Link className="btn btn--ghost btn--small" to={`/wec/${data.id}/calendar`}>
              Весь календарь
            </Link>
          </div>
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
    <article className="card wec-home-last">
      <h2 className="card__title">Последняя гонка</h2>
      {!last ? (
        <p className="muted">В этом сезоне ещё не было гонок с опубликованным результатом.</p>
      ) : (
        <>
          <p className="wec-home-last__name">
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
                  {w.number && <span className="car-no">#{w.number}</span>}{' '}
                  <NameFlag who={w.team} strong emblem />
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

/** First four published championships, keeping the source's names visible across eras. */
function Leaders({
  season,
  tables,
  classes,
}: {
  season: string;
  tables: StandingTable[];
  classes: string[];
}) {
  const shown = tables.slice(0, 4);
  return (
    <>
      {shown.length === 0 ? (
        <p className="muted">Зачётов у источника пока нет.</p>
      ) : (
        <>
          {shown.map((t) => (
            <article key={t.id} className="card wec-leaders__table" aria-label={t.title}>
              <div className="card__head">
                <h2 className="card__title">
                  {t.kind === 'drivers'
                    ? 'Личный зачёт'
                    : t.kind === 'manufacturers'
                      ? 'Производители'
                      : 'Командный зачёт'}
                </h2>
                <ClassBadge cls={classOfTitle(t.title, classes)} />
              </div>
              <p className="wec-home-standing-title">{t.title}</p>
              <ol className="wec-leaders__list">
                {t.rows.slice(0, 5).map((r, i) => (
                  <li
                    key={`${r.name.name}-${i}`}
                    style={
                      { '--bar': `${leaderShare(r.pointsValue, t.rows[0]?.pointsValue)}%` } as CSSProperties
                    }
                  >
                    <span className={posClass('wec-leaders__pos', r.pos)}>{r.posText}</span>
                    <NameFlag
                      who={r.name}
                      kind={t.kind === 'drivers' ? 'driver' : 'team'}
                      emblem={t.kind !== 'drivers'}
                    />
                    <span className="wec-leaders__pts">{r.points}</span>
                  </li>
                ))}
              </ol>
              <Link to={`/wec/${season}/standings?t=${t.id}`} className="card__more">
                Вся таблица →
              </Link>
            </article>
          ))}
        </>
      )}
    </>
  );
}
