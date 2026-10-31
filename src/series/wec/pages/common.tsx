import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { seasonLabel, wecSeasons } from '../data/seasons';
import { rememberWecSeason, useWecSeasonParam } from '../hooks/data';

/** Renders children only for a known WEC season id from the URL. */
export function WecGuard({ children }: { children: (season: string) => ReactNode }) {
  const season = useWecSeasonParam();
  useEffect(() => {
    if (!season) return;
    document.title = `Racing Hub · WEC ${seasonLabel(season)}`;
    rememberWecSeason(season);
  }, [season]);

  if (!season) {
    const latest = wecSeasons()[0];
    return (
      <section className="page">
        <h1>Такого сезона WEC нет</h1>
        <p>
          Чемпионат проводится с 2012 года; сезоны 2018–19 и 2019–20 шли через два года.{' '}
          <Link to={`/wec/${latest}`}>Открыть сезон {seasonLabel(latest)}</Link>
        </p>
      </section>
    );
  }
  return <>{children(season)}</>;
}
