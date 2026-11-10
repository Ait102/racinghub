import { useEffect, useState } from 'react';

import { articleUrl } from '../../../api/wikipedia';
import { CircuitLayoutPanel } from '../../../components/CircuitMap';
import type { CircuitLayout } from '../../../data/circuits';
import type { Named } from '../../../lib/wikiStandings';
import { findFeCircuitLayout } from '../data/circuits';
import type { FeRaceCircuit } from '../domain/race';

export function FeCircuitPanel({
  season,
  venue,
  circuit,
  description,
  article,
}: {
  season: string;
  venue: Named | null;
  circuit: FeRaceCircuit | null;
  description?: string | null;
  article: string;
}) {
  const configuration = findFeCircuitLayout(venue, season);
  const [loaded, setLoaded] = useState<{
    configuration: typeof configuration;
    shape: CircuitLayout | null;
  } | null>(null);

  useEffect(() => {
    if (!configuration) return;
    let active = true;
    configuration.load().then(
      (shape) => {
        if (active) setLoaded({ configuration, shape });
      },
      () => {
        if (active) setLoaded({ configuration, shape: null });
      },
    );
    return () => {
      active = false;
    };
  }, [configuration]);

  if (!venue && !circuit) return null;
  const shape = loaded?.configuration === configuration ? loaded?.shape : null;
  const confirmation = configuration?.confirmations[season];
  const details = (
    <>
      <p className="fe-circuit-description">{circuit?.location || venue?.name}</p>
      {description && (
        <p className="fe-circuit-description" lang="en">
          {description}
        </p>
      )}
      {circuit && (
        <dl className="facts">
          {circuit.course && (
            <div>
              <dt>Тип</dt>
              <dd>{circuit.course === 'Street Circuit' ? 'Уличная трасса' : circuit.course}</dd>
            </div>
          )}
          {circuit.length && !shape && (
            <div>
              <dt>Длина круга</dt>
              <dd>{circuit.length}</dd>
            </div>
          )}
        </dl>
      )}
      <p className="muted small">
        Сведения трассы:{' '}
        <a href={articleUrl(article)} target="_blank" rel="noreferrer">
          Википедия
        </a>
        .
      </p>
    </>
  );

  return shape && configuration && confirmation ? (
    <CircuitLayoutPanel shape={shape} name={venue?.name ?? null} className="fe-circuit-panel">
      <p className="fe-circuit-description">{configuration.description}</p>
      <p className="muted small">
        <a href={confirmation} target="_blank" rel="noreferrer">
          Конфигурация Formula E
        </a>
      </p>
    </CircuitLayoutPanel>
  ) : (
    <article className="card circuit-panel fe-circuit-panel">
      <h2 className="card__title">О трассе</h2>
      {details}
      {(!configuration || loaded?.configuration === configuration) && (
        <p className="muted small">Подтверждённой схемы этой конфигурации Formula E пока нет.</p>
      )}
    </article>
  );
}
