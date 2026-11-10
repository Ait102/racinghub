import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

import { niceAxis, type ChampionshipProgress, type ChampionshipSeries } from '../lib/championshipProgress';
import { formatPoints } from '../lib/format';

const M = { l: 44, r: 16, t: 16, b: 34 };

interface Props {
  rounds: ChampionshipProgress['rounds'];
  series: (ChampionshipSeries & { color: string; dash?: string })[];
}

export function ChampionshipChart({ rounds, series }: Props) {
  const [selected, setHover] = useState<number | null>(null);
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
  const hover = selected === null || n === 0 ? null : Math.min(n - 1, selected);
  const totals = series.flatMap((s) => s.points.filter((p): p is number => p !== null));
  const minimum = Math.min(0, ...totals);
  const maximum = Math.max(0, ...totals);
  const { step } = niceAxis(maximum - minimum);
  const bottom = Math.floor(minimum / step) * step;
  const top = minimum === 0 && maximum === 0 ? 10 : Math.max(step, Math.ceil(maximum / step) * step);

  const x = (i: number) => M.l + (n > 1 ? (i * (W - M.l - M.r)) / (n - 1) : (W - M.l - M.r) / 2);
  const y = (p: number) => M.t + ((top - p) / (top - bottom)) * (H - M.t - M.b);

  function path(points: Array<number | null>): string {
    let d = '';
    let pen = false;
    points.forEach((p, i) => {
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
    if (!n) return;
    if (e.key === 'ArrowRight') setHover(Math.min(n - 1, (hover ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setHover(Math.max(0, (hover ?? n) - 1));
    else if (e.key === 'Home') setHover(0);
    else if (e.key === 'End') setHover(n - 1);
    else if (e.key === 'Escape') setHover(null);
    else return;
    e.preventDefault();
  }

  const ticks: number[] = [];
  for (let v = bottom; v <= top + 1e-9; v += step) ticks.push(v);
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(4, Math.floor(W / 60))));

  // Одна точка не рисует линию — помечаем её маркером, чтобы серия была видна.
  const markers = series.flatMap((s) => {
    const known = s.points.filter((p): p is number => p !== null);
    if (known.length !== 1) return [];
    const i = s.points.findIndex((p) => p !== null);
    return [{ id: s.id, cx: x(i), cy: y(known[0]), color: s.color }];
  });

  const hovered =
    hover === null
      ? []
      : series
          .map((s) => ({ s, p: s.points[hover] ?? null }))
          .filter((x): x is { s: (typeof series)[number]; p: number } => x.p !== null)
          .sort((a, b) => b.p - a.p);

  return (
    <div className="chart points-chart" ref={boxRef}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="chart__svg"
        role="img"
        aria-label={`График очков по этапам: ${series.map((s) => s.label).join(', ')}. Стрелки влево и вправо — переход по этапам.`}
        tabIndex={0}
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') setHover(null);
        }}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
      >
        {ticks.map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className="chart__grid" />
            <text x={M.l - 8} y={y(v)} className="chart__axis" textAnchor="end" dominantBaseline="middle">
              {formatPoints(v)}
            </text>
          </g>
        ))}
        {rounds.map((r, i) =>
          (i % labelEvery === 0 && n - 1 - i >= labelEvery) || i === n - 1 ? (
            <text key={i} x={x(i)} y={H - M.b + 20} className="chart__axis" textAnchor="middle">
              {r.label}
            </text>
          ) : null,
        )}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={H - M.b} className="chart__cursor" />
        )}
        {series.map((s) => (
          <path
            key={s.id}
            d={path(s.points)}
            fill="none"
            stroke={s.color}
            strokeWidth={2.5}
            strokeDasharray={s.dash}
            strokeLinejoin="round"
            strokeLinecap="round"
            data-driver={s.id}
          />
        ))}
        {markers.map((m) => (
          <circle key={`m-${m.id}`} className="chart__dot" cx={m.cx} cy={m.cy} r={4.5} fill={m.color} />
        ))}
        {hovered.map(({ s, p }) => (
          <circle key={s.id} cx={x(hover!)} cy={y(p)} r={4} fill={s.color} />
        ))}
      </svg>

      {hover !== null && (
        <div
          className={`chart__tip${x(hover) > W / 2 ? ' chart__tip--left' : ''}${hovered.length > 10 ? ' chart__tip--stacked' : ''}`}
          style={{ left: `${(x(hover) / W) * 100}%` }}
          role="status"
        >
          <p className="chart__tip-title">{rounds[hover].title}</p>
          <ol>
            {hovered.map(({ s, p }) => (
              <li key={s.id}>
                <span className="team-dot" style={{ background: s.color }} aria-hidden="true" />
                <span className="chart__tip-name" title={s.label}>
                  {s.shortLabel}
                </span>
                <strong>{formatPoints(p)}</strong>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
