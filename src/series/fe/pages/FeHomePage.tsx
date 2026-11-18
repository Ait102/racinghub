import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { leaderShare, Moment, posClass } from '../../../components/ui';
import { useNow } from '../../../hooks/useNow';
import { countdownParts, formatPoints } from '../../../lib/format';
import type { StandingTable } from '../../../lib/wikiStandings';
import { FeStatusBadge, NameFlag, WikiFlagImg, WikiSourceNote } from '../components/bits';
import { feWeekendSchedule } from '../data/schedule';
import { seasonLabel } from '../data/seasons';
import { daysUntil, lastCompleted, nextRound, roundStatus } from '../domain/status';
import type { FeRound, FeSeasonData } from '../domain/types';
import { useFeRace, useFeSeason } from '../hooks/data';
import { FeGuard } from './common';

export function FeHomePage() {
  return <FeGuard>{(season) => <Overview season={season} />}</FeGuard>;
}

function Overview({ season }: { season: string }) {
  const res = useFeSeason(season);
  const now = useNow(60_000);
  const completed = res.status === 'success' ? res.data.rounds.filter((r) => r.winner).length : 0;
  return (
    <section className="page fe-home">
      <PageHeader eyebrow="FIA Formula E" title={`Formula E ${seasonLabel(season)}`}>
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
          </>
        )}
      </PageHeader>
      <DataState
        state={res}
        isEmpty={(data) => data.rounds.length === 0}
        emptyText={
          res.status === 'success' && res.data.unavailable
            ? 'Статья сезона ещё не опубликована в Википедии.'
            : 'У источника пока нет календаря этого сезона.'
        }
      >
        {(data) => (
          <>
            <NextRace data={data} now={now} />
            <div className="grid-3">
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

function NextRace({ data, now }: { data: FeSeasonData; now: Date }) {
  const next = nextRound(data.rounds, now);
  const awaiting = !next && data.rounds.find((round) => roundStatus(round, now) === 'awaiting');
  if (!next)
    return (
      <div className="hero">
        <div className="hero__main">
          <p className="hero__eyebrow">{awaiting ? 'Ждём результаты' : 'Предстоящих этапов нет'}</p>
          {awaiting ? (
            <>
              <Link className="hero__name" to={`/fe/${data.id}/race/${awaiting.round}`}>
                {awaiting.name}
              </Link>
              <p className="muted">Дата этапа прошла, победитель у источника ещё не опубликован.</p>
            </>
          ) : (
            <p className="hero__name">
              {data.rounds.every((round) => round.winner)
                ? 'Сезон завершён'
                : 'У источника нет дат ближайших гонок'}
            </p>
          )}
        </div>
      </div>
    );
  const status = roundStatus(next, now);
  const days = daysUntil(next, now);
  // Race start from the weekend schedule (official timetable), when known to the minute.
  const start = feWeekendSchedule(data.id, next).sessions.find((s) => s.kind === 'race')?.start;
  const left = start && start.length > 10 ? countdownParts(new Date(start), now) : null;
  return (
    <div className="hero">
      <div className="hero__inner">
        <div className="hero__main">
          <p className="hero__eyebrow">
            Следующий этап · {next.round} <FeStatusBadge status={status} />
          </p>
          <Link className="hero__name" to={`/fe/${data.id}/race/${next.round}`}>
            {next.name}
          </Link>
          <p className="hero__place">
            <WikiFlagImg flag={next.country} />
            {next.circuit?.name ?? next.country?.country ?? 'Трасса не указана'}
          </p>
          <p className="hero__date">
            Гонка:{' '}
            {start && start.length > 10 ? (
              <Moment date={start.slice(0, 10)} time={new Date(start).toISOString().slice(11, 19) + 'Z'} />
            ) : (
              next.dateText || '—'
            )}
          </p>
          {next.raceNumber !== null && (
            <p className="muted small">Сдвоенный этап · гонка {next.raceNumber}</p>
          )}
          <div className="fe-home-actions">
            <Link className="btn btn--small" to={`/fe/${data.id}/race/${next.round}`}>
              Открыть этап →
            </Link>
            <Link className="btn btn--ghost btn--small" to={`/fe/${data.id}/calendar`}>
              Весь календарь
            </Link>
          </div>
        </div>
        {left ? (
          <div
            className="countdown"
            role="timer"
            aria-label={`До старта гонки: ${left.days} д ${left.hours} ч ${left.minutes} мин`}
          >
            <CountdownBox value={left.days} label="дней" />
            <CountdownBox value={left.hours} label="часов" />
            <CountdownBox value={left.minutes} label="минут" />
          </div>
        ) : (
          status === 'upcoming' &&
          days !== null &&
          days > 0 && (
            <div className="countdown" role="timer" aria-label={`До даты этапа ${days} дн.`}>
              <div className="countdown__box" aria-hidden="true">
                <span className="countdown__value">{days}</span>
                <span className="countdown__label">дн. до даты этапа</span>
              </div>
              <p className="muted small">Время старта у источника не указано.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function LastRace({ data }: { data: FeSeasonData }) {
  const last = lastCompleted(data.rounds);
  return (
    <article className="card">
      <h2 className="card__title">Последний завершённый этап</h2>
      {!last ? (
        <p className="muted">В этом сезоне ещё нет опубликованного победителя.</p>
      ) : (
        <>
          <p className="fe-home-last__name">
            <Link to={`/fe/${data.id}/race/${last.round}`}>
              <strong>{last.name}</strong>
            </Link>{' '}
            <span className="muted">· этап {last.round}</span>
          </p>
          <dl className="fe-race-facts">
            <div>
              <dt>Победитель</dt>
              <dd>
                <NameFlag who={last.winner} strong />
              </dd>
            </div>
            <div>
              <dt>Команда</dt>
              <dd>
                <NameFlag who={last.winningTeam} kind="team" emblem />
              </dd>
            </div>
            <div>
              <dt>Поул</dt>
              <dd>
                <NameFlag who={last.pole} />
              </dd>
            </div>
            <div>
              <dt>Быстрый круг</dt>
              <dd>
                <NameFlag who={last.fastestLap} />
              </dd>
            </div>
          </dl>
          <Podium season={data.id} round={last} />
        </>
      )}
    </article>
  );
}

function Podium({ season, round }: { season: string; round: FeRound }) {
  const race = useFeRace(season, round.report);
  if (!round.report) return <p className="muted small">Подиум: у источника нет ссылки на протокол.</p>;
  return (
    <div className="fe-home-podium">
      <h3>Подиум</h3>
      <DataState state={race}>
        {(data) => {
          const session =
            round.raceNumber === null
              ? data.races[0]
              : data.races.find((r) => r.raceNumber === round.raceNumber);
          const classifiedPodium =
            session?.classification.filter((row) => row.pos !== null && row.pos >= 1 && row.pos <= 3) ?? [];
          const podium = classifiedPodium.length ? classifiedPodium : (session?.podium ?? []);
          return podium.length === 0 ? (
            <p className="muted">Подиума у источника пока нет.</p>
          ) : (
            <ol className="podium">
              {podium.map((row, index) => (
                <li
                  key={`${row.driver?.article}-${index}`}
                  className={`podium__item${row.pos !== null && row.pos <= 3 ? ` podium__item--${row.pos}` : ''}`}
                >
                  <span className="podium__pos">{'posText' in row ? row.posText : row.pos}</span>
                  <NameFlag who={row.driver} />
                  <span className="podium__team muted">
                    <NameFlag who={row.team} kind="team" emblem />
                  </span>
                </li>
              ))}
            </ol>
          );
        }}
      </DataState>
    </div>
  );
}

/** Drivers' and teams' leaders, as the Formula 1 home shows them. */
function Leaders({ season, tables }: { season: string; tables: StandingTable[] }) {
  const shown = (['drivers', 'teams'] as const).flatMap((kind) => tables.find((t) => t.kind === kind) ?? []);
  if (shown.length === 0) return <p className="muted">Зачётов у источника пока нет.</p>;
  return (
    <>
      {shown.map((table) => (
        <article className="card" key={table.id} aria-label={table.title}>
          <div className="card__head">
            <h2 className="card__title">{table.kind === 'drivers' ? 'Личный зачёт' : 'Командный зачёт'}</h2>
            <Link className="card__more" to={`/fe/${season}/${table.kind}?t=${table.id}`}>
              Вся таблица →
            </Link>
          </div>
          <ol className="leaders">
            {table.rows.slice(0, 5).map((row, index) => (
              <li
                key={`${row.name.name}-${index}`}
                style={
                  {
                    '--bar': `${leaderShare(row.pointsValue, table.rows[0]?.pointsValue, 4)}%`,
                  } as CSSProperties
                }
              >
                <span className={posClass('leaders__pos', row.pos)}>{row.posText}</span>
                <NameFlag
                  who={row.name}
                  kind={table.kind === 'drivers' ? 'driver' : 'team'}
                  emblem={table.kind !== 'drivers'}
                />
                <span className="leaders__pts">
                  {row.pointsValue !== null ? formatPoints(row.pointsValue) : row.points || '—'}
                </span>
              </li>
            ))}
          </ol>
        </article>
      ))}
    </>
  );
}

function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="countdown__box" aria-hidden="true">
      <span className="countdown__value">{String(value).padStart(2, '0')}</span>
      <span className="countdown__label">{label}</span>
    </div>
  );
}
