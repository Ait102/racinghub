import { useEffect, useState } from 'react';

import { CircuitLayoutPanel } from '../../../components/CircuitMap';
import type { CircuitLayout } from '../../../data/circuits';
import { articleUrl } from '../api/wikipedia';
import { findWecCircuit, loadWecCircuit, type WecCircuit } from '../data/circuits';
import { seasonLabel } from '../data/seasons';

export function WecCircuitPanel({
  article,
  name,
  season,
  year,
}: {
  article: string | null;
  name?: string | null;
  season: string;
  /** Exact race year for a season spanning two calendar years. */
  year?: number;
}) {
  const circuit = findWecCircuit(article);
  const [loaded, setLoaded] = useState<{ key: string; shape: CircuitLayout | null } | null>(null);
  const key = `${article}:${season}:${year ?? ''}`;
  useEffect(() => {
    let active = true;
    loadWecCircuit(article, season, year).then(
      (shape) => {
        if (active) setLoaded({ key, shape });
      },
      () => {
        if (active) setLoaded({ key, shape: null });
      },
    );
    return () => {
      active = false;
    };
  }, [article, season, year, key]);
  if (!circuit) return null;
  const shape = loaded?.key === key ? loaded.shape : null;
  const description = <CircuitDescription circuit={circuit} />;
  return shape ? (
    <CircuitLayoutPanel key={key} shape={shape} name={name ?? circuit.article} className="wec-circuit-panel">
      {description}
    </CircuitLayoutPanel>
  ) : (
    <article className="card circuit-panel wec-circuit-panel">
      <h2 className="card__title">О трассе</h2>
      {description}
      {loaded?.key === key && (
        <p className="muted small">Подтверждённой схемы для сезона {seasonLabel(season)} пока нет.</p>
      )}
    </article>
  );
}

function CircuitDescription({ circuit }: { circuit: WecCircuit }) {
  return (
    <>
      <p className="wec-circuit-panel__description">{circuit.description}</p>
      <p className="muted small">
        Сведения:{' '}
        <a href={articleUrl(circuit.article)} target="_blank" rel="noreferrer">
          Википедия
        </a>
        {circuit.configurationSource && (
          <>
            {' '}
            ·{' '}
            <a href={circuit.configurationSource} target="_blank" rel="noreferrer">
              Конфигурация WEC
            </a>
          </>
        )}
        {' · проверено 02.11.2026'}
      </p>
    </>
  );
}
