import { articleUrl } from '../../../api/wikipedia';
import type { FeRaceCircuit } from '../domain/race';

export function FeCircuitPanel({
  name,
  circuit,
  description,
  article,
}: {
  name: string | null | undefined;
  circuit: FeRaceCircuit | null;
  description?: string | null;
  article: string;
}) {
  if (!name && !circuit) return null;
  return (
    <article className="card circuit-panel fe-circuit-panel">
      <h2 className="card__title">О трассе</h2>
      <p className="fe-circuit-description">{circuit?.location || name}</p>
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
          {circuit.length && (
            <div>
              <dt>Длина круга</dt>
              <dd>{circuit.length}</dd>
            </div>
          )}
        </dl>
      )}
      <p className="muted small">Подтверждённой схемы этой конфигурации Formula E пока нет.</p>
      <p className="muted small">
        Сведения трассы:{' '}
        <a href={articleUrl(article)} target="_blank" rel="noreferrer">
          Википедия
        </a>
        .
      </p>
    </article>
  );
}
