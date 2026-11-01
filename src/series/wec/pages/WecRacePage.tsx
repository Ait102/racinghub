import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { DataState, ErrorBox, Loading } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { SortableTable, type Column } from '../../../components/SortableTable';
import { useNow } from '../../../hooks/useNow';
import { articleUrl } from '../api/wikipedia';
import { ClassBadge, Crew, NameFlag, WecStatusBadge, WikiFlagImg, WikiSourceNote } from '../components/bits';
import { seasonLabel } from '../data/seasons';
import { classesOf } from '../domain/parse';
import { roundStatus } from '../domain/status';
import type { PracticeSession, QualifyingTable, RaceEntry, WecRaceData, WecRound } from '../domain/types';
import { useWecRace, useWecSeason } from '../hooks/data';
import { WecGuard } from './common';

type Tab = 'race' | 'qualifying' | 'practice';

export function WecRacePage() {
  return <WecGuard>{(season) => <RaceView season={season} />}</WecGuard>;
}

function RaceView({ season }: { season: string }) {
  const { round = '' } = useParams();
  const res = useWecSeason(season);
  const now = useNow(60_000);
  if (res.status === 'loading') return <Loading rows={6} />;
  if (res.status === 'error') return <ErrorBox error={res.error} onRetry={res.reload} />;
  const r = res.data.rounds.find((x) => String(x.round) === round);
  if (!r) {
    return (
      <section className="page">
        <h1>Этап не найден</h1>
        <p>
          <Link to={`/wec/${season}/calendar`}>← Календарь {seasonLabel(season)}</Link>
        </p>
      </section>
    );
  }
  const status = roundStatus(r, now);
  return (
    <section className="page">
      <nav className="crumbs" aria-label="Навигация">
        <Link to={`/wec/${season}/calendar`}>← Календарь {seasonLabel(season)}</Link>
      </nav>
      <PageHeader eyebrow={`WEC ${seasonLabel(season)} · этап ${r.round}`} title={r.name}>
        <p className="lead">
          <WikiFlagImg flag={r.country} />
          {[r.circuit?.name, r.location].filter(Boolean).join(' · ') || 'Трасса не указана'}
        </p>
        <p className="lead">
          {r.dateText || 'Даты не указаны'} <WecStatusBadge status={status} />
        </p>
        {r.report && (
          <p>
            <a href={articleUrl(r.report)} target="_blank" rel="noreferrer">
              Статья о гонке ↗
            </a>
          </p>
        )}
      </PageHeader>
      {(r.eventArticle ?? r.circuit?.article) && (
        <p>
          <Link
            to={`/wec/${season}/circuit/${encodeURIComponent((r.eventArticle ?? r.circuit?.article)!)}${r.circuit?.article ? `?circuit=${encodeURIComponent(r.circuit.article)}` : ''}`}
          >
            История трассы и победители
          </Link>
        </p>
      )}
      <Winners r={r} />
      {r.report ? (
        <RaceData season={season} article={r.report} />
      ) : (
        <p className="muted">
          {status === 'upcoming'
            ? 'Этап ещё не состоялся — протоколы появятся после гонки.'
            : 'У источника пока нет статьи об этой гонке.'}
        </p>
      )}
      <WikiSourceNote />
    </section>
  );
}

function Winners({ r }: { r: WecRound }) {
  if (r.winners.length === 0) return null;
  return (
    <>
      <h2 className="section-title">Победители классов</h2>
      <ul className="winners winners--cards">
        {r.winners.map((w) => (
          <li key={w.cls} className="winners__item card">
            <ClassBadge cls={w.cls} />
            <span className="winners__team">
              {w.number && <span className="car-no">#{w.number}</span>} <NameFlag who={w.team} strong />
            </span>
            <Crew drivers={w.drivers} />
          </li>
        ))}
      </ul>
    </>
  );
}

function RaceData({ season, article }: { season: string; article: string }) {
  const res = useWecRace(season, article);
  const [tab, setTab] = useState<Tab>('race');
  const [cls, setCls] = useState<string | null>(null);
  return (
    <DataState
      state={res}
      isEmpty={(d) => d.classification.length === 0 && !d.qualifying && d.practice.length === 0}
      emptyText="В статье о гонке пока нет протокола."
    >
      {(d) => {
        const tabs: Array<[Tab, string]> = [
          ['race', 'Гонка'],
          ...(d.qualifying ? ([['qualifying', 'Квалификация']] as Array<[Tab, string]>) : []),
          ...(d.practice.length ? ([['practice', 'Тренировки']] as Array<[Tab, string]>) : []),
        ];
        const classes = classesOf([...d.classification, ...(d.qualifying?.rows ?? [])]);
        return (
          <>
            <div className="tabs" role="tablist" aria-label="Сессии">
              {tabs.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`tab-${id}`}
                  aria-selected={tab === id}
                  aria-controls={`panel-${id}`}
                  className="tab"
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab !== 'practice' && classes.length > 1 && (
              <div className="chips" role="group" aria-label="Класс">
                <button
                  type="button"
                  className="chip"
                  aria-pressed={cls === null}
                  onClick={() => setCls(null)}
                >
                  Все классы
                </button>
                {classes.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="chip"
                    aria-pressed={cls === c}
                    onClick={() => setCls(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
            <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
              {tab === 'race' && <Classification d={d} cls={cls} />}
              {tab === 'qualifying' && d.qualifying && <Qualifying q={d.qualifying} cls={cls} />}
              {tab === 'practice' && <Practice sessions={d.practice} />}
            </div>
          </>
        );
      }}
    </DataState>
  );
}

function Classification({ d, cls }: { d: WecRaceData; cls: string | null }) {
  if (d.classification.length === 0) return <p className="muted">Протокола гонки у источника пока нет.</p>;
  // Place within the class follows the order of classified cars in the source.
  const inClass = new Map<RaceEntry, number>();
  const counters = new Map<string, number>();
  for (const e of d.classification) {
    if (e.pos === null) continue;
    const n = (counters.get(e.cls) ?? 0) + 1;
    counters.set(e.cls, n);
    inClass.set(e, n);
  }
  const rows = cls ? d.classification.filter((e) => e.cls === cls) : d.classification;
  const columns: Column<RaceEntry>[] = [
    {
      key: 'pos',
      header: 'Позиция',
      abbr: 'Поз.',
      align: 'center',
      render: (e) => <strong>{e.posText}</strong>,
      sortValue: (e) => e.pos,
    },
    ...(cls
      ? []
      : ([
          { key: 'cls', header: 'Класс', render: (e) => <ClassBadge cls={e.cls} />, sortValue: (e) => e.cls },
        ] as Column<RaceEntry>[])),
    {
      key: 'inClass',
      header: 'В классе',
      abbr: 'Кл.',
      align: 'center',
      render: (e) => inClass.get(e) ?? '—',
      sortValue: (e) => inClass.get(e) ?? null,
    },
    {
      key: 'no',
      header: '№',
      align: 'center',
      render: (e) => (e.number ? <span className="car-no">#{e.number}</span> : '—'),
    },
    {
      key: 'team',
      header: 'Команда',
      render: (e) => <NameFlag who={e.team} />,
      sortValue: (e) => e.team?.name ?? null,
    },
    { key: 'crew', header: 'Экипаж', render: (e) => <Crew drivers={e.drivers} /> },
    {
      key: 'car',
      header: 'Машина',
      optional: true,
      render: (e) => (
        <span className="wec-car">
          {e.chassis ?? '—'}
          {e.engine && <span className="muted small wec-car__engine">{e.engine}</span>}
        </span>
      ),
    },
    {
      key: 'tyre',
      header: 'Шины',
      abbr: 'Ш.',
      align: 'center',
      optional: true,
      render: (e) => e.tyre ?? '—',
    },
    { key: 'laps', header: 'Круги', align: 'right', render: (e) => e.laps ?? '—', sortValue: (e) => e.laps },
    { key: 'time', header: 'Время / причина', abbr: 'Время', align: 'right', render: (e) => e.time ?? '—' },
  ];
  return (
    <SortableTable
      columns={columns}
      rows={rows}
      rowKey={(e) => `${e.posText}-${e.number}-${e.cls}`}
      caption="Протокол гонки"
      rowClassName={(e) => (inClass.get(e) === 1 ? 'row--class-winner' : undefined)}
    />
  );
}

type QRow = QualifyingTable['rows'][number];

/** Russian names for the usual qualifying columns; anything else stays as the source wrote it. */
function timeColumnLabel(name: string): string {
  const known: Array<[RegExp, string]> = [
    [/^Qualifying$/i, 'Квалификация'],
    [/^(Lap|Time|Best)( time)?$/i, 'Время круга'],
    [/^Gap$/i, 'Отставание'],
  ];
  return known.find(([re]) => re.test(name))?.[1] ?? name;
}

function Qualifying({ q, cls }: { q: QualifyingTable; cls: string | null }) {
  const rows = cls ? q.rows.filter((r) => r.cls === cls) : q.rows;
  const hasDriver = q.rows.some((r) => r.driver);
  const columns: Column<QRow>[] = [
    {
      key: 'pos',
      header: 'Позиция',
      abbr: 'Поз.',
      align: 'center',
      render: (r) => <strong>{r.posText}</strong>,
      sortValue: (r) => r.pos,
    },
    { key: 'cls', header: 'Класс', render: (r) => <ClassBadge cls={r.cls} />, sortValue: (r) => r.cls },
    {
      key: 'no',
      header: '№',
      align: 'center',
      render: (r) => (r.number ? <span className="car-no">#{r.number}</span> : '—'),
    },
    { key: 'team', header: 'Команда', render: (r) => <NameFlag who={r.team} /> },
    ...(hasDriver
      ? ([
          { key: 'driver', header: 'Пилот', render: (r) => <NameFlag who={r.driver} kind="driver" /> },
        ] as Column<QRow>[])
      : []),
    ...q.timeColumns.map<Column<QRow>>((name, i) => ({
      key: `t${i}`,
      header: timeColumnLabel(name),
      align: 'right',
      render: (r) => r.times[i] || '—',
    })),
    ...(q.rows.some((r) => r.grid)
      ? ([{ key: 'grid', header: 'Старт', align: 'center', render: (r) => r.grid ?? '—' }] as Column<QRow>[])
      : []),
  ];
  return (
    <SortableTable
      columns={columns}
      rows={rows}
      rowKey={(r) => `${r.posText}-${r.number}`}
      caption="Квалификация"
    />
  );
}

function Practice({ sessions }: { sessions: PracticeSession[] }) {
  return (
    <>
      <p className="muted small">Лучший круг каждого класса в тренировке — так их публикует источник.</p>
      <div className="grid-2">
        {sessions.map((s) => (
          <article key={s.title} className="card">
            <h3 className="card__title">{s.title.replace(/^Practice/i, 'Тренировка')}</h3>
            <ul className="practice">
              {s.rows.map((r) => (
                <li key={r.cls} className="practice__row">
                  <ClassBadge cls={r.cls} />
                  <span>
                    {r.number && <span className="car-no">#{r.number}</span>}{' '}
                    <NameFlag who={r.driver} kind="driver" />
                    <span className="muted small"> · {r.team?.name ?? '—'}</span>
                  </span>
                  <strong className="practice__time">{r.time ?? '—'}</strong>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </>
  );
}
