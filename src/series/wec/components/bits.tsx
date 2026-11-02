import { Link } from 'react-router-dom';

import { Emblem } from '../../../components/Emblem';
import type { WikiFlag } from '../../../lib/wikitable';
import { teamEmblem } from '../data/emblems';
import { validArticle, type ProfileKind } from '../domain/profiles';
import { WEC_STATUS_LABELS, type WecStatus } from '../domain/status';
import type { Named } from '../domain/types';
import { useWecSeasonParam, useWecTeamCars } from '../hooks/data';

/** Flag picture straight from Wikipedia (flags there are public domain). */
export function WikiFlagImg({ flag }: { flag: WikiFlag | null | undefined }) {
  if (!flag) return null;
  return (
    <img className="flag" src={flag.src} alt="" title={flag.country} width={20} height={14} loading="lazy" />
  );
}

export function NameFlag({
  who,
  strong,
  kind = 'team',
  link = true,
  emblem = false,
}: {
  who: Named | null | undefined;
  strong?: boolean;
  kind?: ProfileKind;
  link?: boolean;
  /** Show the manufacturer emblem before the name (teams and manufacturers). */
  emblem?: boolean;
}) {
  const season = useWecSeasonParam();
  if (!who) return <span className="muted">—</span>;
  const text = strong ? <strong>{who.name}</strong> : who.name;
  return (
    <span className="with-flag">
      {emblem && <WecEmblem who={who} />}
      <WikiFlagImg flag={who.flag} />
      {link && season && who.article && validArticle(who.article) ? (
        <Link to={`/wec/${season}/${kind}/${encodeURIComponent(who.article)}`}>{text}</Link>
      ) : (
        text
      )}
    </span>
  );
}

/** Manufacturer emblem by the team's name or, failing that, by the make of its cars in the season's entry list. */
export function WecEmblem({
  who,
  size = 'sm',
}: {
  who: Pick<Named, 'name' | 'article'>;
  size?: 'sm' | 'lg';
}) {
  const cars = useWecTeamCars(useWecSeasonParam());
  const entry = teamEmblem(who.name, (who.article && cars.get(who.article)) || cars.get(who.name));
  return entry ? <Emblem entry={entry} color={entry.color} size={size} /> : null;
}

/** Drivers of one car, one per line. */
export function Crew({ drivers }: { drivers: Named[] }) {
  if (drivers.length === 0) return <span className="muted">—</span>;
  return (
    <span className="crew">
      {drivers.map((d, i) => (
        <span key={`${d.name}-${i}`} className="crew__driver">
          <NameFlag who={d} kind="driver" />
        </span>
      ))}
    </span>
  );
}

/** CSS-friendly family of a class name: colors are shared by related classes. */
function classSlug(cls: string): string {
  const c = cls.toLowerCase();
  if (c.includes('hypercar')) return 'hypercar';
  if (c.includes('lmp1')) return 'lmp1';
  if (c.includes('lmp2')) return 'lmp2';
  if (c.includes('gt3')) return 'gt3';
  if (c.includes('am')) return 'gte-am';
  if (c.includes('gte') || c.includes('gt')) return 'gte-pro';
  return 'other';
}

/** The two current classes get a boxed two-line mark, like their official signs. */
const CLASS_MARKS: Record<string, [string, string]> = { hypercar: ['HYPER', 'CAR'], lmgt3: ['LM', 'GT3'] };

export function ClassBadge({ cls }: { cls: string | null | undefined }) {
  if (!cls) return <span className="muted">—</span>;
  const slug = classSlug(cls);
  const mark = CLASS_MARKS[cls.toLowerCase().replace(/\s+/g, '')];
  if (mark) {
    return (
      <span className={`class-mark class-mark--${slug}`} title={cls}>
        <span aria-hidden="true">{mark[0]}</span>
        <span aria-hidden="true">{mark[1]}</span>
        <span className="visually-hidden">{cls}</span>
      </span>
    );
  }
  return <span className={`class-badge class-badge--${slug}`}>{cls}</span>;
}

/** Class a championship belongs to, read from its title ("FIA Endurance Trophy for LMGT3 Drivers"). */
export function classOfTitle(title: string, classes: readonly string[]): string | undefined {
  return classes.find((cls) => title.toLowerCase().includes(cls.toLowerCase()));
}

/** Several classes side by side, e.g. a team entered in Hypercar and LMGT3. */
export function ClassList({ classes }: { classes: readonly string[] }) {
  return (
    <span className="wec-classes">
      {classes.map((cls) => (
        <ClassBadge key={cls} cls={cls} />
      ))}
    </span>
  );
}

export function WecStatusBadge({ status }: { status: WecStatus }) {
  return (
    <span className={`badge badge--${status === 'unknown' ? 'unknown' : status}`}>
      {WEC_STATUS_LABELS[status]}
    </span>
  );
}

export function WikiSourceNote() {
  return (
    <p className="muted small">
      Данные WEC — из{' '}
      <a
        href="https://en.wikipedia.org/wiki/FIA_World_Endurance_Championship"
        target="_blank"
        rel="noreferrer"
      >
        английской Википедии
      </a>{' '}
      (
      <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
        CC BY-SA 4.0
      </a>
      ), их ведут участники сообщества. Результаты обычно появляются через несколько часов или на следующий
      день после гонки.
    </p>
  );
}
