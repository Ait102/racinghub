import { useEffect, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { articleUrl } from '../../../api/wikipedia';
import { Emblem } from '../../../components/Emblem';
import { teamEmblem } from '../../../data/emblems';
import { countryFlagUrl } from '../../../lib/flags';
import { validArticle } from '../../../lib/wikiArticle';
import type { Named, ResultCell, StandingRow } from '../../../lib/wikiStandings';
import { imsa } from '../data/seasons';
import { IMSA_STATUS_LABELS, type ImsaStatus } from '../domain/season';

export function ImsaGuard({ children }: { children: (season: string) => ReactNode }) {
  const { season } = useParams();
  const valid = imsa.isSeasonId(season);
  useEffect(() => {
    if (!valid) return;
    imsa.remember(season);
    document.title = `IMSA ${season} · Racing Hub`;
  }, [season, valid]);
  if (!valid) {
    const latest = imsa.seasons()[0];
    return (
      <section className="page">
        <h1>Такого сезона IMSA нет</h1>
        <p>
          Чемпионат проводится с 2014 года. <Link to={`/imsa/${latest}`}>Открыть сезон {latest}</Link>
        </p>
      </section>
    );
  }
  return <>{children(season)}</>;
}

export type ProfileLinkKind = 'driver' | 'team' | 'circuit' | 'external';

/** Name with its flag and, for teams and makes, the make emblem; links to the Wikipedia article. */
export function ImsaName({
  who,
  strong,
  emblem,
  kind = 'external',
  cars,
}: {
  who: Named | null | undefined;
  strong?: boolean;
  emblem?: boolean;
  /** Profile page on the site; 'external' links to the Wikipedia article. */
  kind?: ProfileLinkKind;
  /** Car models of a team: its make emblem when the name does not start with the make. */
  cars?: string[];
}) {
  const season = imsa.fromPath(useLocation().pathname);
  if (!who) return <span className="muted">—</span>;
  const text = strong ? <strong>{who.name}</strong> : who.name;
  const entry = emblem || cars ? teamEmblem(who.name, cars?.filter(Boolean)) : null;
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
      {who.article && validArticle(who.article) && season && kind !== 'external' ? (
        <Link to={`/imsa/${season}/${kind}/${encodeURIComponent(who.article)}`}>{text}</Link>
      ) : who.article && validArticle(who.article) ? (
        <a href={articleUrl(who.article)} target="_blank" rel="noreferrer">
          {text}
        </a>
      ) : (
        text
      )}
    </span>
  );
}

/** A standings name: each driver of a crew sharing the row gets their own profile link. */
export function ImsaRowName({ row, kind }: { row: StandingRow; kind: ProfileLinkKind }) {
  if (!row.crew)
    return (
      <ImsaName
        who={row.name}
        kind={kind}
        emblem={kind === 'external'}
        cars={kind === 'team' && row.extra ? [row.extra] : undefined}
      />
    );
  return (
    <span className="wiki-crew">
      {row.crew.map((who) => (
        <ImsaName key={who.name} who={who} kind={kind} />
      ))}
    </span>
  );
}

export function ImsaStatusBadge({ status }: { status: ImsaStatus }) {
  return <span className={`badge badge--${status}`}>{IMSA_STATUS_LABELS[status]}</span>;
}

/** Class code as a small tag, e.g. "GTD Pro". */
export function ClassTag({ cls }: { cls: string }) {
  // Boxed mark in the class colour, like IMSA's class signs (GTD Pro on two lines).
  const slug = cls.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const lines = /^gtd-pro$/.test(slug) ? ['GTD', 'PRO'] : [cls.toUpperCase()];
  return (
    <span className={`imsa-class imsa-class--${slug}`} title={cls}>
      {lines.map((line) => (
        <span key={line} aria-hidden="true">
          {line}
        </span>
      ))}
      <span className="visually-hidden">{cls}</span>
    </span>
  );
}

/** A standings cell coloured as the source colours it. */
export function ImsaResult({ cell }: { cell: ResultCell | undefined }) {
  return (
    <span className={`imsa-result${cell?.tone ? ` imsa-result--${cell.tone}` : ''}`}>
      {cell?.main ?? (cell?.text || '·')}
      {cell?.sup && <sup>{cell.sup}</sup>}
    </span>
  );
}

export function ImsaSourceNote() {
  return (
    <p className="muted small">
      Данные IMSA — из английской Википедии,{' '}
      <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
        CC BY-SA 4.0
      </a>
      . Места и очки — как у источника, без пересчёта.
    </p>
  );
}

export const IMSA_EMPTY = (unavailable: boolean | undefined) =>
  unavailable
    ? 'Статья сезона ещё не опубликована в Википедии.'
    : 'У источника пока нет календаря этого сезона.';

/** Small flag of a country (local flag set); nothing when the country is unknown. */
export function CountryFlag({ country }: { country: string | null | undefined }) {
  const src = countryFlagUrl(country);
  if (!src) return null;
  return (
    <img
      className="flag"
      src={src}
      alt=""
      title={country ?? undefined}
      width={20}
      height={14}
      loading="lazy"
    />
  );
}
