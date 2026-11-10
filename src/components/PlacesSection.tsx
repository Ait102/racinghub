import { useState } from 'react';

import { placeSeries } from '../lib/places';
import type { StandingTable } from '../lib/wikiStandings';
import { PlacesChart, seriesStyle } from './PlacesChart';

const TOP = [5, 10, 'all'] as const;

export function PlacesSection({ table, seriesId }: { table: StandingTable; seriesId: 'wec' | 'fe' }) {
  const [top, setTop] = useState<(typeof TOP)[number]>(5);
  const [pointed, setPointed] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const series = placeSeries(table, top === 'all' ? Infinity : top);
  const highlight = pointed ?? (series.some((s) => s.id === picked) ? picked : null);
  if (series.length === 0) return null;
  return (
    <>
      <h2 className="section-title">Места по этапам</h2>
      <div className="chips" role="group" aria-label="Сколько строк зачёта показать">
        {TOP.map((t) => (
          <button key={t} type="button" className="chip" aria-pressed={top === t} onClick={() => setTop(t)}>
            {t === 'all' ? 'Все' : `Топ-${t}`}
          </button>
        ))}
      </div>
      <p className="muted small">
        Места в отдельных гонках, как в таблице источника. Сходы, NC и DSQ отмечены крестиком, пропуски —
        пунктиром. Чтобы увидеть результат этапа, наведите курсор, коснитесь графика или используйте стрелки.
        Выберите имя в легенде, чтобы выделить линию.
      </p>
      <div className={`card chart-card places-card ${seriesId}-places-card`}>
        <PlacesChart
          rounds={table.rounds.map((r) => r.abbr)}
          roundLabels={table.rounds.map(({ abbr, report }) =>
            report ? `${abbr} · ${report.replaceAll('_', ' ')}` : abbr,
          )}
          series={series}
          highlight={highlight}
          classPrefix={`${seriesId}-places-chart`}
        />
        <ul className="legend" onMouseLeave={() => setPointed(null)}>
          {series.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                className="places-legend-pick"
                aria-pressed={picked === s.id}
                onMouseEnter={() => setPointed(s.id)}
                onFocus={() => setPointed(s.id)}
                onBlur={() => setPointed(null)}
                onClick={() => setPicked((p) => (p === s.id ? null : s.id))}
              >
                <svg width="26" height="10" aria-hidden="true">
                  <line
                    x1="1"
                    x2="25"
                    y1="5"
                    y2="5"
                    stroke={seriesStyle(i).color}
                    strokeWidth="3"
                    strokeDasharray={seriesStyle(i).dash}
                  />
                </svg>
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
