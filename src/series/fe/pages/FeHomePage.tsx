import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { leaderShare, posClass } from '../../../components/ui';
import { useNow } from '../../../hooks/useNow';
import type { StandingTable } from '../../../lib/wikiStandings';
import { FeStatusBadge, NameFlag, WikiFlagImg, WikiSourceNote } from '../components/bits';
import { seasonLabel } from '../data/seasons';
import { daysUntil, lastCompleted, nextRound, roundStatus } from '../domain/status';
import type { FeRound, FeSeasonData } from '../domain/types';
import { useFeRace, useFeSeason } from '../hooks/data';
import { useFeFavorites } from '../hooks/favorites';
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
            <div className="fe-home-grid">
              <LastRace data={data} />
              <Leaders season={season} tables={data.standings} />
            </div>
            <Favorites tables={data.standings} season={season} />
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
          <p className="hero__date">Дата: {next.dateText || '—'}</p>
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
        {status === 'upcoming' && days !== null && days > 0 && (
          <div className="countdown" role="timer" aria-label={`До даты этапа ${days} дн.`}>
            <div className="countdown__box" aria-hidden="true">
              <span className="countdown__value">{days}</span>
              <span className="countdown__label">дн. до даты этапа</span>
            </div>
            <p className="muted small">Время старта у источника не указано.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LastRace({ data }: { data: FeSeasonData }) {
  const last = lastCompleted(data.rounds);
  return (
    <article className="card fe-home-last">
      <h2 className="card__title">Последняя гонка</h2>
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
            <ol className="fe-podium-list">
              {podium.map((row, index) => (
                <li key={`${row.driver?.article}-${index}`}>
                  <span className={posClass('fe-leaders__pos', row.pos)}>
                    {'posText' in row ? row.posText : row.pos}
                  </span>
                  <NameFlag who={row.driver} />
                  <span className="muted small">
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

function Leaders({ season, tables }: { season: string; tables: StandingTable[] }) {
  const shown = tables.filter((table) => table.kind === 'drivers' || table.kind === 'teams');
  if (shown.length === 0) return <p className="muted">Зачётов у источника пока нет.</p>;
  return (
    <>
      {shown.map((table) => (
        <article className="card" key={table.id} aria-label={table.title}>
          <h2 className="card__title">{table.kind === 'drivers' ? 'Личный зачёт' : 'Командный зачёт'}</h2>
          <p className="fe-home-standing-title">{table.title}</p>
          <ol className="fe-leaders__list">
            {table.rows.slice(0, 5).map((row, index) => (
              <li
                key={`${row.name.name}-${index}`}
                style={
                  { '--bar': `${leaderShare(row.pointsValue, table.rows[0]?.pointsValue)}%` } as CSSProperties
                }
              >
                <span className={posClass('fe-leaders__pos', row.pos)}>{row.posText}</span>
                <NameFlag
                  who={row.name}
                  kind={table.kind === 'drivers' ? 'driver' : 'team'}
                  emblem={table.kind !== 'drivers'}
                />
                <span className="fe-leaders__pts">{row.points || '—'}</span>
              </li>
            ))}
          </ol>
          <Link className="card__more" to={`/fe/${season}/standings?t=${table.id}`}>
            Вся таблица →
          </Link>
        </article>
      ))}
    </>
  );
}

function Favorites({ tables, season }: { tables: StandingTable[]; season: string }) {
  const { favs } = useFeFavorites();
  const all = [
    ...favs.drivers.map((article) => ({ article, kind: 'drivers' as const })),
    ...favs.teams.map((article) => ({ article, kind: 'teams' as const })),
  ];
  return (
    <article className="card fe-favorites">
      <h2 className="card__title">★ Избранное</h2>
      {all.length === 0 ? (
        <p className="muted small">
          Добавьте пилотов и команды в избранное на странице{' '}
          <Link to={`/fe/${season}/standings`}>зачётов</Link> — здесь появятся их место и очки.
        </p>
      ) : (
        <ul className="fe-favorites-list">
          {all.map(({ article, kind }) => {
            const found = tables
              .filter((table) => table.kind === kind)
              .flatMap((table) => table.rows.map((row) => ({ table, row })))
              .find(({ row }) => row.name.article === article);
            return (
              <li key={`${kind}:${article}`}>
                <span className="fe-leaders__pos">{found?.row.posText || '—'}</span>
                <span>
                  {found ? (
                    <NameFlag who={found.row.name} kind={kind === 'drivers' ? 'driver' : 'team'} />
                  ) : (
                    <Link
                      to={`/fe/${season}/${kind === 'drivers' ? 'driver' : 'team'}/${encodeURIComponent(article)}`}
                    >
                      {article}
                    </Link>
                  )}
                </span>
                <span>
                  {found ? (
                    <>
                      {found.row.points || '—'}{' '}
                      <Link className="muted small" to={`/fe/${season}/standings?t=${found.table.id}`}>
                        {found.table.title}
                      </Link>
                    </>
                  ) : (
                    <span className="muted small">нет в зачётах сезона</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
