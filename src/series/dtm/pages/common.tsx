import { useEffect, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';

import { articleUrl } from '../../../api/wikipedia';
import { Emblem } from '../../../components/Emblem';
import { teamEmblem } from '../../../data/emblems';
import { validArticle } from '../../../lib/wikiArticle';
import type { Named, ResultCell } from '../../../lib/wikiStandings';
import { dtm } from '../data/seasons';
import { DTM_STATUS_LABELS, type DtmRace, type DtmStatus } from '../domain/season';

export function DtmGuard({ children }: { children: (season: string) => ReactNode }) {
  const { season } = useParams();
  const valid = dtm.isSeasonId(season);
  useEffect(() => {
    if (!valid) return;
    dtm.remember(season);
    document.title = `DTM ${season} · Racing Hub`;
  }, [season, valid]);
  if (!valid) {
    const latest = dtm.seasons()[0];
    return (
      <section className="page">
        <h1>Такого сезона DTM нет</h1>
        <p>
          Сайт показывает DTM с возрождения серии в 2000 году.{' '}
          <Link to={`/dtm/${latest}`}>Открыть сезон {latest}</Link>
        </p>
      </section>
    );
  }
  return <>{children(season)}</>;
}

/** Name with its flag and, for teams and makes, the make emblem; links to the Wikipedia article. */
export function DtmName({
  who,
  strong,
  emblem,
}: {
  who: Named | null | undefined;
  strong?: boolean;
  emblem?: boolean;
}) {
  if (!who) return <span className="muted">—</span>;
  const text = strong ? <strong>{who.name}</strong> : who.name;
  const entry = emblem ? teamEmblem(who.name) : null;
  return (
    <span className="with-flag">
      {entry && <Emblem entry={entry} color={entry.color} size="sm" />}
      {who.flag && (
        <img
          className="flag"
          src={who.flag.src}
          alt=""
          title={who.flag.country}
          width={20}
          height={14}
          loading="lazy"
        />
      )}
      {who.article && validArticle(who.article) ? (
        <a href={articleUrl(who.article)} target="_blank" rel="noreferrer">
          {text}
        </a>
      ) : (
        text
      )}
    </span>
  );
}

export function DtmStatusBadge({ status }: { status: DtmStatus }) {
  return <span className={`badge badge--${status}`}>{DTM_STATUS_LABELS[status]}</span>;
}

/** "Этап 3 · гонка 2", or just the event for one-race events. */
export const raceLabel = (race: DtmRace) => `Этап ${race.round}${race.race ? ` · гонка ${race.race}` : ''}`;

/** A standings cell: the place as published, with its superscript (qualifying points) kept apart. */
export function DtmResult({ cell }: { cell: ResultCell | undefined }) {
  return (
    <span className={`dtm-result${cell?.tone ? ` dtm-result--${cell.tone}` : ''}`}>
      {cell?.main ?? (cell?.text || '·')}
      {cell?.sup && <sup title="Очки квалификации или пометка источника">{cell.sup}</sup>}
    </span>
  );
}

export function DtmSourceNote() {
  return (
    <p className="muted small">
      Данные DTM — из английской Википедии,{' '}
      <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
        CC BY-SA 4.0
      </a>
      . Места и очки — как у источника, без пересчёта; результаты появляются после того, как их внесут в
      статью.
    </p>
  );
}

export const DTM_EMPTY = (unavailable: boolean | undefined) =>
  unavailable
    ? 'Статья сезона ещё не опубликована в Википедии.'
    : 'У источника пока нет календаря этого сезона.';
