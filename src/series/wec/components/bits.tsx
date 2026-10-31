import type { WikiFlag } from '../../../lib/wikitable';
import { WEC_STATUS_LABELS, type WecStatus } from '../domain/status';
import type { Named } from '../domain/types';

/** Flag picture straight from Wikipedia (flags there are public domain). */
export function WikiFlagImg({ flag }: { flag: WikiFlag | null | undefined }) {
  if (!flag) return null;
  return (
    <img className="flag" src={flag.src} alt="" title={flag.country} width={20} height={14} loading="lazy" />
  );
}

export function NameFlag({ who, strong }: { who: Named | null | undefined; strong?: boolean }) {
  if (!who) return <span className="muted">—</span>;
  return (
    <span className="with-flag">
      <WikiFlagImg flag={who.flag} />
      {strong ? <strong>{who.name}</strong> : who.name}
    </span>
  );
}

/** Drivers of one car, one per line. */
export function Crew({ drivers }: { drivers: Named[] }) {
  if (drivers.length === 0) return <span className="muted">—</span>;
  return (
    <span className="crew">
      {drivers.map((d, i) => (
        <span key={`${d.name}-${i}`} className="crew__driver">
          <NameFlag who={d} />
        </span>
      ))}
    </span>
  );
}

/** CSS-friendly family of a class name: colors are shared by related classes. */
export function classSlug(cls: string): string {
  const c = cls.toLowerCase();
  if (c.includes('hypercar')) return 'hypercar';
  if (c.includes('lmp1')) return 'lmp1';
  if (c.includes('lmp2')) return 'lmp2';
  if (c.includes('gt3')) return 'gt3';
  if (c.includes('am')) return 'gte-am';
  if (c.includes('gte') || c.includes('gt')) return 'gte-pro';
  return 'other';
}

export function ClassBadge({ cls }: { cls: string | null | undefined }) {
  if (!cls) return <span className="muted">—</span>;
  return <span className={`class-badge class-badge--${classSlug(cls)}`}>{cls}</span>;
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
      Данные WEC — из английской Википедии (CC BY-SA 4.0), их ведут участники сообщества. Результаты обычно
      появляются через несколько часов или на следующий день после гонки.
    </p>
  );
}
