import { useSearchParams } from 'react-router-dom';

import { DataState, MetaLine } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { SortableTable, type Column } from '../../../components/SortableTable';
import { ClassBadge, NameFlag, WikiSourceNote } from '../components/bits';
import { seasonLabel } from '../data/seasons';
import { compareSeasons, type ComparedSeason, type SeasonResult } from '../domain/compare';
import { profileStats, validArticle } from '../domain/profiles';
import type { Named } from '../domain/types';
import { useWecParticipants, useWecProfile } from '../hooks/data';
import { WecGuard } from './common';

export function WecComparePage() {
  return <WecGuard>{(season) => <Compare season={season} />}</WecGuard>;
}

function Compare({ season }: { season: string }) {
  const [params, setParams] = useSearchParams();
  const a = params.get('a') ?? '';
  const b = params.get('b') ?? '';
  const participants = useWecParticipants(season, true);
  const drivers = participants.status === 'success' ? participants.data.map((p) => p.who) : [];
  const invalid = [a, b].some((article) => article && !validArticle(article));

  function set(side: 'a' | 'b', article: string) {
    const next = new URLSearchParams(params);
    if (article) next.set(side, article);
    else next.delete(side);
    setParams(next);
  }

  function swap() {
    const next = new URLSearchParams(params);
    if (b) next.set('a', b);
    else next.delete('a');
    if (a) next.set('b', a);
    else next.delete('b');
    setParams(next);
  }

  return (
    <section className="page">
      <PageHeader eyebrow={`WEC ${seasonLabel(season)}`} title="Сравнение пилотов">
        <p className="lead">
          Карьеры и итоги сезонов рядом. Места и очки — как у источника, без суммирования.
        </p>
      </PageHeader>
      <DataState state={participants}>
        {() => (
          <>
            <div className="wec-compare-pickers">
              <DriverPicker
                label="Пилот 1"
                value={a}
                drivers={drivers}
                onChange={(article) => set('a', article)}
              />
              <button
                type="button"
                className="btn btn--ghost btn--small"
                disabled={!a && !b}
                onClick={swap}
                aria-label="Поменять пилотов местами"
              >
                ⇄
              </button>
              <DriverPicker
                label="Пилот 2"
                value={b}
                drivers={drivers}
                onChange={(article) => set('b', article)}
              />
            </div>
            <p className="muted small">
              В списках — заявка выбранного сезона. Уже выбранные пилоты сохраняются при смене сезона, их
              карьеры не ограничены этим годом.
            </p>
          </>
        )}
      </DataState>
      {invalid ? (
        <p className="state state--error" role="alert">
          Недопустимое название статьи пилота. Выберите пилота из списка.
        </p>
      ) : a && b && a !== b ? (
        <CompareBody a={a} b={b} drivers={drivers} season={season} />
      ) : (
        <div className="state state--empty">
          {a && a === b
            ? 'Выберите двух разных пилотов.'
            : 'Выберите двух пилотов, чтобы сравнить их карьеры.'}
        </div>
      )}
      <WikiSourceNote />
    </section>
  );
}

function DriverPicker({
  label,
  value,
  drivers,
  onChange,
}: {
  label: string;
  value: string;
  drivers: Named[];
  onChange: (article: string) => void;
}) {
  const options = drivers.filter((driver) => driver.article && validArticle(driver.article));
  return (
    <label className="wec-compare-picker">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— выберите —</option>
        {value && !options.some((driver) => driver.article === value) && (
          <option value={value}>{value.replace(/_/g, ' ')}</option>
        )}
        {options.map((driver) => (
          <option key={driver.article} value={driver.article!}>
            {driver.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function CompareBody({ a, b, drivers, season }: { a: string; b: string; drivers: Named[]; season: string }) {
  const left = useWecProfile(a, 'driver');
  const right = useWecProfile(b, 'driver');
  if (left.status === 'success' && right.status === 'success' && left.data.article === right.data.article) {
    return (
      <p className="state state--empty" role="alert">
        Обе ссылки ведут на одного пилота. Выберите двух разных пилотов.
      </p>
    );
  }
  const pairs =
    left.status === 'success' && right.status === 'success' ? compareSeasons(left.data, right.data) : [];
  const columns: Column<ComparedSeason>[] = [
    { key: 'season', header: 'Сезон', render: (row) => seasonLabel(row.season) },
    {
      key: 'a',
      header: left.status === 'success' ? left.data.article : a,
      render: (row) => <SeasonResults rows={row.a} />,
    },
    {
      key: 'b',
      header: right.status === 'success' ? right.data.article : b,
      render: (row) => <SeasonResults rows={row.b} />,
    },
  ];
  return (
    <>
      <div className="grid-2 wec-compare-drivers">
        {[left, right].map((state, i) => (
          <article key={i} className="card wec-compare-driver" aria-label={`Карьера пилота ${i + 1}`}>
            <DataState state={state}>
              {(profile) => {
                const stats = profileStats(profile);
                const hasWec = profile.tables.some((table) => table.kind === 'wec');
                const who = drivers.find(
                  (driver) => driver.article === profile.article || driver.article === (i === 0 ? a : b),
                );
                return (
                  <>
                    <h2 className="card__title">
                      <NameFlag
                        who={{
                          name: profile.article.replace(/_/g, ' '),
                          article: profile.article,
                          flag: who?.flag ?? null,
                        }}
                        kind="driver"
                      />
                    </h2>
                    <dl className="wec-compare-metrics">
                      {[
                        ['Сезонов WEC в статье', hasWec ? stats.seasons : null],
                        ['Титулов завершённых сезонов', stats.titles],
                        ['Побед в классе Ле-Мана', stats.leMansWins],
                        ['Подиумов в классе Ле-Мана', stats.leMansPodiums],
                      ].map(([label, value]) => (
                        <div key={String(label)}>
                          <dt>{label}</dt>
                          <dd>{value ?? '—'}</dd>
                        </div>
                      ))}
                    </dl>
                    {!hasWec && <p className="muted">Нет таблицы результатов WEC в статье.</p>}
                  </>
                );
              }}
            </DataState>
          </article>
        ))}
      </div>
      <p className="muted small">
        Титулы учитываются только за завершённые сезоны. Победы и подиумы в классе — по отдельной колонке
        Ле-Мана. Итоги разных классов не сравниваются как равнозначные; полнота истории зависит от статей.
      </p>
      {left.status === 'success' && right.status === 'success' && (
        <div className="wec-compare-seasons">
          <h2 className="section-title">Итоги WEC по сезонам</h2>
          {pairs.length ? (
            <SortableTable
              caption="Итоги WEC по сезонам"
              columns={columns}
              rows={pairs}
              rowKey={(row) => row.season}
              rowClassName={(row) => (row.season === season ? 'wec-profile-current' : undefined)}
            />
          ) : (
            <p className="state state--empty">Нет таблиц результатов WEC для сравнения.</p>
          )}
          <MetaLine meta={left.meta} onRefresh={left.reload} />
          <MetaLine meta={right.meta} onRefresh={right.reload} />
        </div>
      )}
    </>
  );
}

function SeasonResults({ rows }: { rows: SeasonResult[] }) {
  if (!rows.length) return <span className="muted">нет у источника</span>;
  return (
    <ul className="wec-compare-results">
      {rows.map((row, i) => (
        <li key={i}>
          <ClassBadge cls={row.cls} /> <span>{row.team ?? '—'}</span>
          <span className="wec-compare-result">
            Место: <strong>{row.position ?? '—'}</strong> · Очки: <strong>{row.points ?? '—'}</strong>
          </span>
        </li>
      ))}
    </ul>
  );
}
