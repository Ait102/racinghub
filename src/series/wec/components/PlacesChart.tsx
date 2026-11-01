import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

import type { PlaceSeries } from '../domain/places';

const M = { l: 36, r: 16, t: 16, b: 34 };
const COLORS = ['#4da3ff', '#ff9f43', '#2ecc71', '#e84393', '#f1c40f', '#a29bfe', '#1abc9c', '#ff6b6b'];

/** Color per series; from the ninth on the colors repeat with a dashed line. */
export function seriesStyle(i: number): { color: string; dash?: string } {
  return { color: COLORS[i % COLORS.length], dash: i >= COLORS.length ? '7 5' : undefined };
}

interface Props {
  rounds: string[];
  series: PlaceSeries[];
}

export function PlacesChart({ rounds, series }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // Draw in real pixels so axis labels stay readable on phones.
  const [W, setW] = useState(800);
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = W < 560 ? Math.round(W * 0.9) : Math.min(460, Math.round(W * 0.5));
  const n = rounds.length;
  const worst = Math.max(2, ...series.flatMap((s) => s.places.filter((p): p is number => p !== null)));
  const step = worst <= 10 ? 1 : worst <= 20 ? 2 : 5;

  const x = (i: number) => M.l + (n > 1 ? (i * (W - M.l - M.r)) / (n - 1) : (W - M.l - M.r) / 2);
  // Place 1 is at the top.
  const y = (p: number) => M.t + ((p - 1) / (worst - 1)) * (H - M.t - M.b);

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
    if (!rect || n === 0) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = n > 1 ? Math.round(((px - M.l) / (W - M.l - M.r)) * (n - 1)) : 0;
    setHover(Math.max(0, Math.min(n - 1, i)));
  }

  function onKey(e: KeyboardEvent<SVGSVGElement>) {
    if (e.key === 'ArrowRight') setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? n) - 1));
    else if (e.key === 'Escape') setHover(null);
    else return;
    e.preventDefault();
  }

  const ticks: number[] = [];
  for (let v = 1; v <= worst; v += step) ticks.push(v);

  // Numeric places first, then "Ret", "NC"… as the source writes them; empty cells are left out.
  const hovered =
    hover === null
      ? []
      : series
          .map((s, i) => ({ s, i, p: s.places[hover], text: s.texts[hover] }))
          .filter((r) => r.text !== '')
          .sort((a, b) => (a.p ?? Infinity) - (b.p ?? Infinity));

  return (
    <div className="chart" ref={boxRef}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="chart__svg"
        role="img"
        aria-label={`График мест по этапам: ${series.map((s) => s.label).join(', ')}. Те же значения — в таблице выше. Стрелки влево и вправо — переход по этапам.`}
        tabIndex={0}
        onPointerMove={onPointer}
        onPointerLeave={() => setHover(null)}
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
          <text key={`${r}-${i}`} x={x(i)} y={H - M.b + 20} className="chart__axis" textAnchor="middle">
            {r}
          </text>
        ))}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} className="chart__cursor" />
        )}
        {series.map((s, i) => {
          const st = seriesStyle(i);
          return (
            <g key={s.id}>
              <path
                d={path(s.places)}
                fill="none"
                stroke={st.color}
                strokeWidth={2.5}
                strokeDasharray={st.dash}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {s.places.map((p, j) =>
                p === null ? null : <circle key={j} cx={x(j)} cy={y(p)} r={3.5} fill={st.color} />,
              )}
            </g>
          );
        })}
      </svg>

      {hover !== null && (
        <div
          className={`chart__tip${x(hover) > W / 2 ? ' chart__tip--left' : ''}`}
          style={{ left: `${(x(hover) / W) * 100}%` }}
          role="status"
        >
          <p className="chart__tip-title">{rounds[hover]}</p>
          <ol>
            {hovered.map(({ s, i, text }) => (
              <li key={s.id}>
                <span className="team-dot" style={{ background: seriesStyle(i).color }} aria-hidden="true" />
                {s.label}
                <strong>{text}</strong>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
