import { useState } from 'react';

import type { ChampionshipProgress, ChampionshipSeries } from '../lib/championshipProgress';
import { formatPoints } from '../lib/format';
import type { StandingTable } from '../lib/wikiStandings';
import { ChampionshipChart } from './ChampionshipChart';
import { seriesStyle } from './PlacesChart';
import { PlacesSection } from './PlacesSection';

const TOP = [5, 10, 'all'] as const;
const ALL_LABEL = {
  drivers: 'Все пилоты',
  teams: 'Все команды',
  manufacturers: 'Все производители',
};

function crewCurves(series: ChampionshipSeries[]): ChampionshipSeries[] {
  const curves = new Map<string, ChampionshipSeries>();
  for (const entry of series) {
    // Only identical trajectories for drivers in the same numbered car share a line.
    const key = entry.group ? JSON.stringify([entry.group, entry.points]) : entry.id;
    const curve = curves.get(key);
    if (curve) {
      curve.label += `, ${entry.label}`;
      curve.shortLabel += ` / ${entry.shortLabel}`;
    } else {
      curves.set(key, { ...entry });
    }
  }
  return [...curves.values()];
}

export function StandingsCharts({
  table,
  seriesId,
  progress,
}: {
  table: StandingTable;
  seriesId: 'wec' | 'fe';
  progress: ChampionshipProgress | null;
}) {
  const [top, setTop] = useState<(typeof TOP)[number]>(5);
  const groups = new Map<string, number>();
  const isWecDrivers = seriesId === 'wec' && table.kind === 'drivers';
  const entries = isWecDrivers ? crewCurves(progress?.series ?? []) : (progress?.series ?? []);
  const shown = entries.slice(0, top === 'all' ? undefined : top).map((entry, index) => {
    const first = entry.group ? groups.get(entry.group) : undefined;
    if (entry.group && first === undefined) groups.set(entry.group, index);
    const style = seriesStyle(first ?? index);
    return { ...entry, color: style.color, dash: first === undefined ? style.dash : '7 5' };
  });

  return (
    <>
      <h2 className="section-title">Очки после каждого этапа</h2>
      {progress && shown.length ? (
        <>
          <div className="chips" role="group" aria-label="Сколько участников показать">
            {TOP.map((limit) => (
              <button
                key={limit}
                type="button"
                className="chip"
                aria-pressed={limit === top}
                onClick={() => setTop(limit)}
              >
                {limit === 'all' ? ALL_LABEL[table.kind] : `Топ-${limit}`}
              </button>
            ))}
          </div>
          <p className="muted small">
            Накопленные очки по официальным зачётам. Наведите на график или используйте стрелки.
            {isWecDrivers && ' Пилоты одного экипажа с одинаковыми очками показаны одной линией.'}
          </p>
          <div className="card chart-card">
            <ChampionshipChart
              rounds={
                seriesId === 'wec'
                  ? progress.rounds.map((round, index) => ({
                      label: String(index + 1),
                      title: `Этап ${index + 1} · ${round.title}`,
                    }))
                  : progress.rounds
              }
              series={shown}
            />
            <ul className="legend">
              {shown.map((entry) => (
                <li key={entry.id}>
                  <svg width="26" height="10" aria-hidden="true">
                    <line
                      x1="1"
                      x2="25"
                      y1="5"
                      y2="5"
                      stroke={entry.color}
                      strokeWidth="3"
                      strokeDasharray={entry.dash}
                    />
                  </svg>
                  <span className="points-legend__name" style={{ borderColor: entry.color }}>
                    {entry.label}
                  </span>
                  <span className="muted">{formatPoints(entry.points.at(-1) ?? null)}</span>
                </li>
              ))}
            </ul>
          </div>
          <details className="chart-table">
            <summary>Таблица очков по этапам и источники</summary>
            <div className="table-wrap">
              <table className="table">
                <caption className="visually-hidden">Очки после каждого этапа</caption>
                <thead>
                  <tr>
                    <th scope="col">Участник</th>
                    {progress.rounds.map((round, index) => (
                      <th key={index} scope="col" className="align-right" title={round.title}>
                        {round.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((entry) => (
                    <tr key={entry.id}>
                      <th scope="row">{entry.label}</th>
                      {progress.rounds.map((_, index) => (
                        <td key={index} className="align-right">
                          {formatPoints(entry.points[index] ?? null)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="small">
              {progress.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </>
      ) : (
        <p className="muted small">
          Для этого сезона и зачёта пока нет подтверждённых накопленных очков по этапам.
        </p>
      )}
      <details className="chart-table">
        <summary>Места в отдельных гонках</summary>
        <PlacesSection table={table} seriesId={seriesId} />
      </details>
    </>
  );
}
