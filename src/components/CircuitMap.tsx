import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { eraLabel, loadCircuit, type CircuitLayout } from '../data/circuits';
import { Stat } from './ui';

const FULL_BOX = { x: 0, y: 0, w: 500, h: 500 };

/**
 * Circuit outline + basic stats (length, turns, direction) for a given season.
 * Renders nothing at all when the layout for that season is unknown — the same
 * "no data, no block" rule the rest of the app follows.
 */
export function CircuitPanel({
  circuitId,
  name,
  season,
}: {
  circuitId: string | null;
  name: string | null;
  /** Layouts change over the years; the shape has to match the season. */
  season: number;
}) {
  const [shape, setShape] = useState<CircuitLayout | null>(null);

  useEffect(() => {
    let alive = true;
    setShape(null);
    loadCircuit(circuitId, season).then((s) => {
      if (alive) setShape(s);
    });
    return () => {
      alive = false;
    };
  }, [circuitId, season]);

  return shape ? <CircuitLayoutPanel shape={shape} name={name} /> : null;
}

/** The same map rendering is used by every series; only layout selection differs. */
export function CircuitLayoutPanel({
  shape,
  name,
  children,
  className = '',
}: {
  shape: CircuitLayout;
  name: string | null;
  children?: ReactNode;
  className?: string;
}) {
  const [box, setBox] = useState(FULL_BOX);
  const line = useRef<SVGPathElement>(null);

  // The source outlines leave different margins inside their 500 × 500 frame,
  // so the viewBox is tightened to the drawing itself for a consistent weight.
  useLayoutEffect(() => {
    const el = line.current;
    if (!el || typeof el.getBBox !== 'function') {
      setBox(FULL_BOX);
      return;
    }
    const b = el.getBBox();
    if (!b.width || !b.height) return;
    const pad = Math.max(b.width, b.height) * 0.07;
    setBox({ x: b.x - pad, y: b.y - pad, w: b.width + pad * 2, h: b.height + pad * 2 });
  }, [shape]);

  const era = eraLabel(shape);
  const label = `Схема трассы${name ? ` ${name}` : ''}: ${shape.turns} поворотов, длина ${shape.lengthKm} км`;

  return (
    <article className={`card circuit-panel${className ? ` ${className}` : ''}`}>
      <h2 className="card__title">Схема трассы</h2>
      <div className="circuit-panel__body">
        <div className="circuit-map">
          <svg
            className="circuit-map__svg"
            viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
            role="img"
            aria-label={label}
          >
            <path className="circuit-map__glow" d={shape.d} pathLength={1} />
            <path ref={line} className="circuit-map__line" d={shape.d} pathLength={1} />
          </svg>
        </div>
        <div className="circuit-panel__meta">
          {children}
          <div className="stats">
            <Stat label="Длина" value={`${shape.lengthKm} км`} />
            <Stat label="Поворотов" value={shape.turns} />
            <Stat
              label="Направление"
              value={shape.direction === 'clockwise' ? 'По часовой' : 'Против часовой'}
            />
          </div>
          <p className="muted small">
            Схема:{' '}
            <a href={shape.source?.url ?? 'https://github.com/f1db/f1db'} target="_blank" rel="noreferrer">
              {shape.source?.name ?? 'F1DB'}
            </a>
            ,{' '}
            <a
              href={shape.source?.licenseUrl ?? 'https://creativecommons.org/licenses/by/4.0/'}
              target="_blank"
              rel="noreferrer"
            >
              {shape.source?.license ?? 'CC BY 4.0'}
            </a>
            {shape.source?.changes ? ` · ${shape.source.changes}` : ''}
            {era ? ` · конфигурация ${era}` : ''}
          </p>
        </div>
      </div>
    </article>
  );
}
