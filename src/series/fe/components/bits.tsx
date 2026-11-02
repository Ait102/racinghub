import { Link, useLocation } from 'react-router-dom';

import { articleUrl } from '../../../api/wikipedia';
import { validArticle } from '../../../lib/wikiArticle';
import type { Named } from '../../../lib/wikiStandings';
import type { WikiFlag } from '../../../lib/wikitable';
import { feSeasonFromPath } from '../data/seasons';
import { FE_STATUS_LABELS, type FeStatus } from '../domain/status';

export function WikiFlagImg({ flag }: { flag: WikiFlag | null | undefined }) {
  if (!flag) return null;
  return (
    <img className="flag" src={flag.src} alt="" title={flag.country} width={20} height={14} loading="lazy" />
  );
}

/** Where a name leads: a driver or team profile on the site, or the source article. */
export type FeLinkKind = 'driver' | 'team' | 'external';

export function NameFlag({
  who,
  strong,
  link = true,
  kind = 'driver',
}: {
  who: Named | null | undefined;
  strong?: boolean;
  link?: boolean;
  kind?: FeLinkKind;
}) {
  const season = feSeasonFromPath(useLocation().pathname);
  if (!who) return <span className="muted">—</span>;
  const text = strong ? <strong>{who.name}</strong> : who.name;
  const article = link && who.article && validArticle(who.article) ? who.article : null;
  return (
    <span className="with-flag">
      <WikiFlagImg flag={who.flag} />
      {article && season && kind !== 'external' ? (
        <Link to={`/fe/${season}/${kind}/${encodeURIComponent(article)}`}>{text}</Link>
      ) : article ? (
        <a href={articleUrl(article)} target="_blank" rel="noreferrer">
          {text}
        </a>
      ) : (
        text
      )}
    </span>
  );
}

export function FeStatusBadge({ status }: { status: FeStatus }) {
  return <span className={`badge badge--${status}`}>{FE_STATUS_LABELS[status]}</span>;
}

export function WikiSourceNote() {
  return (
    <p className="muted small">
      Данные Formula E — из английской Википедии,{' '}
      <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
        CC BY-SA 4.0
      </a>
      . Результаты могут появляться спустя несколько часов или на следующий день после гонки.
    </p>
  );
}
