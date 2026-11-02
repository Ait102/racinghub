import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { articleUrl } from '../../../api/wikipedia';
import { DataState, ErrorBox, Loading, MetaLine } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { SortableTable, type Column } from '../../../components/SortableTable';
import { useNow } from '../../../hooks/useNow';
import { validArticle } from '../../../lib/wikiArticle';
import { FeStatusBadge, NameFlag, WikiFlagImg, WikiSourceNote } from '../components/bits';
import { FeCircuitPanel } from '../components/FeCircuitPanel';
import { seasonLabel } from '../data/seasons';
import type { FeQualifyingTable, FeRaceEntry } from '../domain/race';
import { roundStatus } from '../domain/status';
import type { FeRound } from '../domain/types';
import { useFeRace, useFeSeason } from '../hooks/data';
import { FeGuard } from './common';

export function FeRacePage() {
  return <FeGuard>{(season) => <RaceView season={season} />}</FeGuard>;
}

function RaceView({ season }: { season: string }) {
  const { round = '' } = useParams();
  const res = useFeSeason(season);
  const now = useNow(60_000);
  if (res.status === 'loading') return <Loading rows={6} />;
  if (res.status === 'error') return <ErrorBox error={res.error} onRetry={res.reload} />;
  const r = res.data.rounds.find((entry) => String(entry.round) === round);
  if (!r)
    return (
      <section className="page">
        <h1>Этап не найден</h1>
        <Link to={`/fe/${season}/calendar`}>← Календарь {seasonLabel(season)}</Link>
      </section>
    );
  const status = roundStatus(r, now);
  // "2026 Monaco ePrix" → the event's own article "Monaco ePrix" with winners across the years.
  const eprix = r.report?.replace(/^\d{4} /, '') ?? (/ePrix$/.test(r.name) ? r.name : null);
  return (
    <section className="page fe-page">
      <nav className="crumbs" aria-label="Навигация">
        <Link to={`/fe/${season}/calendar`}>← Календарь {seasonLabel(season)}</Link>
      </nav>
      <PageHeader eyebrow={`Formula E ${seasonLabel(season)} · этап ${r.round}`} title={r.name}>
        <p className="lead">
          <WikiFlagImg flag={r.country} />
          {r.circuit?.name || 'Трасса не указана'}
        </p>
        <p className="lead">
          {r.dateText || 'Даты не указаны'} <FeStatusBadge status={status} />
        </p>
        {r.raceNumber !== null && <p className="muted">Сдвоенный этап · Race {r.raceNumber}</p>}
        <p className="fe-race-links">
          {eprix && validArticle(eprix) && (
            <Link to={`/fe/${season}/eprix/${encodeURIComponent(eprix)}`}>История E-Prix →</Link>
          )}
          {r.report && (
            <a href={articleUrl(r.report)} target="_blank" rel="noreferrer">
              Статья о гонке ↗
            </a>
          )}
        </p>
      </PageHeader>
      <div className="fe-race-summary grid-2">
        <article className="card">
          <h2 className="card__title">Победитель</h2>
          <NameFlag who={r.winner} strong />
          <p className="muted">
            <NameFlag who={r.winningTeam} kind="team" emblem />
          </p>
        </article>
        <article className="card">
          <h2 className="card__title">Поул и быстрый круг</h2>
          <p>
            Поул: <NameFlag who={r.pole} />
          </p>
          <p>
            Быстрый круг: <NameFlag who={r.fastestLap} />
          </p>
        </article>
      </div>
      <MetaLine meta={res.meta} onRefresh={res.reload} />
      {r.report ? (
        <RaceData
          key={`${r.report}:${r.raceNumber}`}
          season={season}
          round={r}
          rounds={res.data.rounds}
          article={r.report}
        />
      ) : (
        <>
          <FeCircuitPanel name={r.circuit?.name} circuit={null} article={res.data.article} />
          <p className="muted">
            {status === 'upcoming'
              ? 'Этап ещё не состоялся — протоколы появятся после гонки.'
              : 'У источника пока нет статьи об этой гонке.'}
          </p>
        </>
      )}
      <WikiSourceNote />
    </section>
  );
}

function RaceData({
  season,
  round,
  rounds,
  article,
}: {
  season: string;
  round: FeRound;
  rounds: FeRound[];
  article: string;
}) {
  const res = useFeRace(season, article);
  const [tab, setTab] = useState<'race' | 'qualifying'>('race');
  return (
    <DataState state={res} emptyText="В статье о гонке пока нет протокола.">
      {(data) => {
        const race =
          data.races.find((r) => r.raceNumber === round.raceNumber) ??
          (round.raceNumber === null && data.races.length === 1 ? data.races[0] : undefined);
        return (
          <>
            <FeCircuitPanel
              name={round.circuit?.name}
              circuit={data.circuit}
              description={data.description}
              article={article}
            />
            {data.races.length > 1 && (
              <div className="chips fe-race-tabs" role="group" aria-label="Гонка сдвоенного этапа">
                {data.races.map((r) => {
                  const target = rounds.find(
                    (entry) => entry.report === article && entry.raceNumber === r.raceNumber,
                  );
                  return target ? (
                    <Link
                      key={r.raceNumber}
                      className="chip"
                      aria-current={target.round === round.round ? 'page' : undefined}
                      to={`/fe/${season}/race/${target.round}`}
                    >
                      {r.title}
                    </Link>
                  ) : null;
                })}
              </div>
            )}
            {race ? (
              <>
                <div className="tabs fe-session-tabs" role="group" aria-label="Сессии">
                  <button
                    type="button"
                    className="tab"
                    aria-pressed={tab === 'race'}
                    onClick={() => setTab('race')}
                  >
                    Гонка
                  </button>
                  <button
                    type="button"
                    className="tab"
                    aria-pressed={tab === 'qualifying'}
                    onClick={() => setTab('qualifying')}
                  >
                    Квалификация
                  </button>
                </div>
                {tab === 'race' ? (
                  <Classification rows={race.classification} />
                ) : (
                  <Qualifying tables={race.qualifying} />
                )}
              </>
            ) : (
              <p className="muted">В статье о гонке пока нет протокола.</p>
            )}
          </>
        );
      }}
    </DataState>
  );
}

function Classification({ rows }: { rows: FeRaceEntry[] }) {
  if (!rows.length) return <p className="muted">Протокола гонки у источника пока нет.</p>;
  const columns: Column<FeRaceEntry>[] = [
    {
      key: 'pos',
      header: 'Позиция',
      abbr: 'Поз.',
      align: 'center',
      render: (r) => <strong>{r.posText || '—'}</strong>,
      sortValue: (r) => r.pos,
    },
    { key: 'number', header: '№', align: 'center', render: (r) => r.number ?? '—' },
    {
      key: 'driver',
      header: 'Пилот',
      render: (r) => <NameFlag who={r.driver} />,
      sortValue: (r) => r.driver?.name ?? null,
    },
    {
      key: 'team',
      header: 'Команда',
      render: (r) => <NameFlag who={r.team} kind="team" emblem />,
      sortValue: (r) => r.team?.name ?? null,
    },
    { key: 'laps', header: 'Круги', align: 'right', render: (r) => r.laps ?? '—' },
    { key: 'time', header: 'Время / причина', abbr: 'Время', align: 'right', render: (r) => r.time ?? '—' },
    { key: 'grid', header: 'Старт', align: 'center', render: (r) => r.grid ?? '—' },
    { key: 'points', header: 'Очки', align: 'right', render: (r) => r.points ?? '—' },
  ];
  return (
    <SortableTable
      columns={columns}
      rows={rows}
      rowKey={(r) => `${r.posText}:${r.number}:${r.driver?.name}`}
      caption="Протокол гонки Formula E"
    />
  );
}

function Qualifying({ tables }: { tables: FeQualifyingTable[] }) {
  if (!tables.length) return <p className="muted">Протокола квалификации у источника пока нет.</p>;
  const names: Record<FeQualifyingTable['kind'], string> = {
    groups: 'Группы',
    duels: 'Дуэли',
    classification: 'Итоговая классификация',
  };
  return (
    <div className="fe-qualifying-groups">
      {tables.map((table, index) => (
        <section key={`${table.kind}:${index}`}>
          <h2 className="section-title">{names[table.kind]}</h2>
          {table.kind === 'duels' && (
            <p className="muted small">Участники каждой дуэли идут парами в порядке источника.</p>
          )}
          <SortableTable
            columns={table.columns.map((name, i) => ({
              key: String(i),
              header: name,
              render: (r: { cells: string[]; index: number }) => r.cells[i] || '—',
            }))}
            rows={table.rows.map((cells, i) => ({ cells, index: i }))}
            rowKey={(r) => String(r.index)}
            caption={`Квалификация Formula E: ${names[table.kind]}`}
          />
        </section>
      ))}
    </div>
  );
}
