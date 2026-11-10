import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

import type { PlaceSeries } from '../lib/places';

const M = { l: 44, r: 16, t: 16, b: 34 };
// Ten clearly different hues on the dark card; the first five (Top-5) are the most distinct.
const COLORS = [
  '#4da3ff',
  '#ffb000',
  '#2ecc71',
  '#ff4d8d',
  '#b48cff',
  '#22d3ee',
  '#f97316',
  '#a3e635',
  '#e5e7eb',
  '#ef4444',
];
/** Height of the bottom row for retirements ("Ret", "NC", "DSQ"…), which have no place to plot. */
const OUT_ROW = 30;

/** Color per series; from the eleventh on the colors repeat with a dashed line. */
export function seriesStyle(i: number): { color: string; dash?: string } {
  return { color: COLORS[i % COLORS.length], dash: i >= COLORS.length ? '7 5' : undefined };
}

interface Props {
  rounds: string[];
  roundLabels?: string[];
  series: PlaceSeries[];
  /** Series to bring forward (legend hover or pick); the others fade. */
  highlight?: string | null;
  classPrefix?: string;
}

/** Pairs of known places with only gaps between them: drawn as a faint dashed bridge. */
function bridges(places: Array<number | null>): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let last = -1;
  places.forEach((p, i) => {
    if (p === null) return;
    if (last >= 0 && i - last > 1) out.push([last, i]);
    last = i;
  });
  return out;
}

export function PlacesChart({
  rounds,
  roundLabels,
  series,
  highlight = null,
  classPrefix = 'wec-places-chart',
}: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // Draw in real pixels so axis labels stay readable on phones.
  const [W, setW] = useState(800);
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => {
      if (e.contentRect.width > 0) setW(Math.round(e.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = W < 560 ? Math.max(280, Math.round(W * 0.9)) : Math.min(460, Math.round(W * 0.5));
  const n = rounds.length;
  const active = hover === null || n === 0 ? null : Math.min(hover, n - 1);
  const longestLabel = Math.min(10, Math.max(0, ...rounds.map((r) => r.length)));
  const crowded = n > 1 && (W - M.l - M.r) / (n - 1) < longestLabel * 7 + 8;
  const bottom = crowded ? 30 + longestLabel * 6 : M.b;
  const worst = Math.max(2, ...series.flatMap((s) => s.places.filter((p): p is number => p !== null)));
  const isOut = (s: PlaceSeries, j: number) => s.places[j] === null && (s.texts[j] ?? '').trim() !== '';
  const hasOut = series.some((s) => s.places.some((_, j) => isOut(s, j)));
  const plotBottom = H - bottom - (hasOut ? OUT_ROW : 0);
  const outY = plotBottom + OUT_ROW * 0.6;
  const step = Math.max(1, Math.ceil((worst - 1) / Math.max(1, Math.floor((plotBottom - M.t) / 28))));

  const x = (i: number) => M.l + (n > 1 ? (i * (W - M.l - M.r)) / (n - 1) : (W - M.l - M.r) / 2);
  // Place 1 is at the top.
  const y = (p: number) => M.t + ((p - 1) / (worst - 1)) * (plotBottom - M.t);
  // The highlighted line is drawn last so it stays on top.
  const order = series
    .map((s, i) => ({ s, i }))
    .sort((a, b) => Number(a.s.id === highlight) - Number(b.s.id === highlight));

  function path(places: Array<number | null>): string {
    let d = '';
    let pen = false;
    places.forEach((p, i) => {
      if (p === null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(p).toFixed(1)}`;
      pen = true;
    });
    return d;
  }

  function onPointer(e: PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || n === 0) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = n > 1 ? Math.round(((px - M.l) / (W - M.l - M.r)) * (n - 1)) : 0;
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  function onKey(e: KeyboardEvent<SVGSVGElement>) {
    if (n === 0) return;
    if (e.key === 'ArrowRight') setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setHover(Math.max(0, (active ?? n) - 1));
    else if (e.key === 'Home') setHover(0);
    else if (e.key === 'End') setHover(n - 1);
    else if (e.key === 'Escape') setHover(null);
    else return;
    e.preventDefault();
  }

  const ticks: number[] = [];
  for (let v = 1; v < worst; v += step) ticks.push(v);
  if (worst - ticks[ticks.length - 1] < step / 2 && ticks.length > 1) ticks.pop();
  ticks.push(worst);

  // Numeric places first, then "Ret", "NC"… as the source writes them; empty cells are left out.
  const hovered =
    active === null
      ? []
      : series
          .map((s, i) => ({ s, i, p: s.places[active], text: s.texts[active] ?? '' }))
          .filter((r) => r.text.trim() !== '')
          .sort((a, b) => (a.p ?? Infinity) - (b.p ?? Infinity));

  return (
    <div className={`chart places-chart ${classPrefix}`} ref={boxRef}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="chart__svg"
        role="img"
        aria-label={`График мест по этапам: ${series.map((s) => s.label).join(', ')}. Те же значения — в таблице выше. Стрелки влево и вправо — переход по этапам, Home и End — первый и последний этап, Escape — скрыть результаты.`}
        tabIndex={0}
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className="chart__grid" />
            <text x={M.l - 8} y={y(v)} className="chart__axis" textAnchor="end" dominantBaseline="middle">
              {v}
            </text>
          </g>
        ))}
        {rounds.map((r, i) => (
          <text
            key={`${r}-${i}`}
            x={x(i)}
            y={H - bottom + 20}
            className="chart__axis"
            textAnchor={crowded || i === n - 1 ? 'end' : i === 0 ? 'start' : 'middle'}
            transform={crowded ? `rotate(-60 ${x(i)} ${H - bottom + 20})` : undefined}
          >
            <title>{roundLabels?.[i] ?? r}</title>
            {r.length > 10 ? `${r.slice(0, 9)}…` : r}
          </text>
        ))}
        {hasOut && (
          <g>
            <line x1={M.l} x2={W - M.r} y1={outY} y2={outY} className={`chart__grid ${classPrefix}__out`} />
            <text x={M.l - 8} y={outY} className="chart__axis" textAnchor="end" dominantBaseline="middle">
              сход
            </text>
          </g>
        )}
        {active !== null && (
          <line x1={x(active)} x2={x(active)} y1={M.t} y2={H - bottom} className="chart__cursor" />
        )}
        {order.map(({ s, i }) => {
          const st = seriesStyle(i);
          const faded = highlight !== null && s.id !== highlight;
          return (
            <g key={s.id} opacity={faded ? 0.15 : 1} data-series={s.id}>
              <path
                d={path(s.places)}
                fill="none"
                stroke={st.color}
                strokeWidth={s.id === highlight ? 4 : 2.5}
                strokeDasharray={st.dash}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {bridges(s.places).map(([a, b]) => (
                <line
                  key={`gap-${a}`}
                  x1={x(a)}
                  y1={y(s.places[a]!)}
                  x2={x(b)}
                  y2={y(s.places[b]!)}
                  stroke={st.color}
                  strokeWidth={1.5}
                  strokeDasharray="3 5"
                  opacity={0.55}
                />
              ))}
              {s.places.map((p, j) =>
                p === null ? null : (
                  <circle key={j} cx={x(j)} cy={y(p)} r={j === active ? 5 : 3.5} fill={st.color} />
                ),
              )}
              {s.places.map((_, j) =>
                isOut(s, j) ? (
                  <path
                    key={`out-${j}`}
                    d={`M${x(j) - 4},${outY - 4}l8,8m0,-8l-8,8`}
                    stroke={st.color}
                    strokeWidth={2}
                    strokeLinecap="round"
                  >
                    <title>{`${s.label}: ${s.texts[j]}`}</title>
                  </path>
                ) : null,
              )}
            </g>
          );
        })}
      </svg>

      {active !== null && (
        <div
          className={`chart__tip${x(active) >= W / 2 ? ' chart__tip--left' : ''}${hovered.length > 10 ? ' places-chart__tip--stacked' : ''}`}
          style={{ left: `${(x(active) / W) * 100}%` }}
          role="status"
        >
          <p className="chart__tip-title">{roundLabels?.[active] ?? rounds[active]}</p>
          {hovered.length === 0 && <p className="muted">Результатов пока нет.</p>}
          <ol>
            {hovered.map(({ s, i, text }) => (
              <li key={s.id}>
                <span className="team-dot" style={{ background: seriesStyle(i).color }} aria-hidden="true" />
                <span className={`${classPrefix}__name`}>{s.label}</span>
                <strong>{text}</strong>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
