import { articleUrl } from '../../../api/wikipedia';
import type { Named } from '../../../lib/wikiStandings';
import type { WikiFlag } from '../../../lib/wikitable';
import { FE_STATUS_LABELS, type FeStatus } from '../domain/status';

export function WikiFlagImg({ flag }: { flag: WikiFlag | null | undefined }) {
  if (!flag) return null;
  return (
    <img className="flag" src={flag.src} alt="" title={flag.country} width={20} height={14} loading="lazy" />
  );
}

/** Profile pages are a later stage; linked names open the actual source article. */
export function NameFlag({
  who,
  strong,
  link = true,
}: {
  who: Named | null | undefined;
  strong?: boolean;
  link?: boolean;
}) {
  if (!who) return <span className="muted">—</span>;
  const text = strong ? <strong>{who.name}</strong> : who.name;
  return (
    <span className="with-flag">
      <WikiFlagImg flag={who.flag} />
      {link && who.article ? (
        <a href={articleUrl(who.article)} target="_blank" rel="noreferrer">
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
