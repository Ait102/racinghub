import { useEffect, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';

import { feSeasons, isSeasonId, rememberFeSeason, seasonLabel } from '../data/seasons';

export function FeGuard({ children }: { children: (season: string) => ReactNode }) {
  const { season } = useParams();
  const valid = isSeasonId(season);
  useEffect(() => {
    if (!valid) return;
    rememberFeSeason(season);
    document.title = `Racing Hub · Formula E ${seasonLabel(season)}`;
  }, [season, valid]);
  if (!valid) {
    const latest = feSeasons()[0];
    return (
      <section className="page">
        <h1>Такого сезона Formula E нет</h1>
        <p>
          Чемпионат проводится с 2014–15 года.{' '}
          <Link to={`/fe/${latest}`}>Открыть сезон {seasonLabel(latest)}</Link>
        </p>
      </section>
    );
  }
  return <>{children(season)}</>;
}
