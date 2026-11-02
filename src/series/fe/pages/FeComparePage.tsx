import { useSearchParams } from 'react-router-dom';

import { DataState } from '../../../components/DataState';
import { PageHeader } from '../../../components/PageHeader';
import { SortableTable, type Column } from '../../../components/SortableTable';
import { validArticle } from '../../../lib/wikiArticle';
import type { Named } from '../../../lib/wikiStandings';
import { NameFlag, WikiSourceNote } from '../components/bits';
import { seasonLabel } from '../data/seasons';
import { seasonResults, type FeProfile } from '../domain/profiles';
import { useFeParticipants, useFeProfile } from '../hooks/data';
import { FeGuard } from './common';

/** Infobox figures compared side by side, exactly as each article publishes them. */
const METRICS = ['Старты', 'Победы', 'Подиумы', 'Поулы', 'Быстрые круги', 'Титулы', 'Дебют в FE'];

type Result = ReturnType<typeof seasonResults>[number];
interface Pair {
  season: string;
  a: Result[];
  b: Result[];
}

/** Every source row is kept: a driver can change team within one season. */
function pairSeasons(a: FeProfile, b: FeProfile): Pair[] {
  const pairs = new Map<string, Pair>();
  for (const [side, profile] of [
    ['a', a],
    ['b', b],
  ] as const) {
    for (const row of seasonResults(profile)) {
      const pair = pairs.get(row.season) ?? { season: row.season, a: [], b: [] };
      pair[side].push(row);
      pairs.set(row.season, pair);
    }
  }
  return [...pairs.values()].sort((x, y) => y.season.localeCompare(x.season));
}

export function FeComparePage() {
  return <FeGuard>{(season) => <Compare season={season} />}</FeGuard>;
}

function Compare({ season }: { season: string }) {
  const [params, setParams] = useSearchParams();
  const a = params.get('a') ?? '';
  const b = params.get('b') ?? '';
  const participants = useFeParticipants(season, true);
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
      <PageHeader eyebrow={`Formula E ${seasonLabel(season)}`} title="Сравнение пилотов">
        <p className="lead">Карьеры и итоги сезонов рядом. Цифры — как у источника, без пересчёта.</p>
      </PageHeader>
      <DataState state={participants}>
        {() => (
          <div className="fe-compare-pickers">
            <DriverPicker label="Пилот 1" value={a} drivers={drivers} onChange={(v) => set('a', v)} />
            <button
              type="button"
              className="btn btn--ghost btn--small"
              disabled={!a && !b}
              onClick={swap}
              aria-label="Поменять пилотов местами"
            >
              ⇄
            </button>
            <DriverPicker label="Пилот 2" value={b} drivers={drivers} onChange={(v) => set('b', v)} />
          </div>
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
    <label className="fe-compare-picker">
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
  const left = useFeProfile(a, 'driver');
  const right = useFeProfile(b, 'driver');
  if (left.status === 'success' && right.status === 'success' && left.data.article === right.data.article) {
    return (
      <p className="state state--empty" role="alert">
        Обе ссылки ведут на одного пилота. Выберите двух разных пилотов.
      </p>
    );
  }
  const columns: Column<Pair>[] = [
    { key: 'season', header: 'Сезон', render: (row) => seasonLabel(row.season) },
    {
      key: 'a',
      header: left.status === 'success' ? left.data.article : a,
      render: (row) => <Results rows={row.a} />,
    },
    {
      key: 'b',
      header: right.status === 'success' ? right.data.article : b,
      render: (row) => <Results rows={row.b} />,
    },
  ];
  return (
    <>
      <div className="grid-2 fe-compare-drivers">
        {[left, right].map((state, i) => (
          <article key={i} className="card" aria-label={`Карьера пилота ${i + 1}`}>
            <DataState state={state}>
              {(profile) => {
                const who = drivers.find(
                  (d) => d.article === profile.article || d.article === (i === 0 ? a : b),
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
                      />
                    </h2>
                    <dl className="fe-compare-metrics">
                      {METRICS.map((label) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{profile.facts.find((f) => f.label === label)?.value ?? '—'}</dd>
                        </div>
                      ))}
                    </dl>
                  </>
                );
              }}
            </DataState>
          </article>
        ))}
      </div>
      <p className="muted small">Цифры карьеры — из карточек статей Википедии о пилотах.</p>
      {left.status === 'success' && right.status === 'success' && (
        <div className="fe-compare-seasons">
          <h2 className="section-title">Итоги по сезонам</h2>
          {pairSeasons(left.data, right.data).length ? (
            <SortableTable
              caption="Итоги Formula E по сезонам"
              columns={columns}
              rows={pairSeasons(left.data, right.data)}
              rowKey={(row) => row.season}
              rowClassName={(row) => (row.season === season ? 'fe-profile-current' : undefined)}
            />
          ) : (
            <p className="state state--empty">Нет таблиц результатов Formula E для сравнения.</p>
          )}
        </div>
      )}
    </>
  );
}

function Results({ rows }: { rows: Result[] }) {
  if (!rows.length) return <span className="muted">нет у источника</span>;
  return (
    <ul className="fe-compare-results">
      {rows.map((row, i) => (
        <li key={i}>
          <span>{row.team ?? '—'}</span>
          <span className="fe-compare-result">
            Место: <strong>{row.position ?? '—'}</strong> · Очки: <strong>{row.points ?? '—'}</strong>
          </span>
        </li>
      ))}
    </ul>
  );
}
