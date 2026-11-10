import { useEffect } from 'react';
import { Link } from 'react-router-dom';

import { articleUrl } from '../api/wikipedia';
import { PageHeader } from './PageHeader';

/** A series that is being prepared: the season, its source article and what is coming. */
export function UpcomingSeasonPage({
  series,
  name,
  season,
  valid,
  latest,
  article,
  planned,
  onSeason,
}: {
  /** URL prefix, e.g. "imsa". */
  series: string;
  name: string;
  season: string;
  valid: boolean;
  latest: string;
  article: string;
  planned: string[];
  onSeason: (id: string) => void;
}) {
  useEffect(() => {
    if (!valid) return;
    onSeason(season);
    document.title = `${name} ${season} · Racing Hub`;
  }, [name, season, valid, onSeason]);

  if (!valid) {
    return (
      <section className="page">
        <h1>Такого сезона {name} нет</h1>
        <Link to={`/${series}/${latest}`}>Открыть сезон {latest}</Link>
      </section>
    );
  }
  return (
    <section className="page">
      <PageHeader eyebrow={`${name} · раздел в разработке`} title={`${name} ${season}`}>
        <p className="lead">
          Данные будут браться из{' '}
          <a href={articleUrl(article)} target="_blank" rel="noreferrer">
            статьи сезона в английской Википедии
          </a>{' '}
          — как у WEC и Formula E: очки и места без пересчёта, под каждым блоком источник.
        </p>
      </PageHeader>
      <article className="card">
        <h2 className="card__title">Что появится</h2>
        <ul>
          {planned.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}
