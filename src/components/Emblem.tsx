import { useState, type CSSProperties, type ReactNode } from 'react';

export interface EmblemEntry {
  /** File name in public/logos/. */
  file: string;
  /** Where the file came from (link). */
  source: string;
  /** Licence or permission that allows using it on this site. */
  license: string;
  /** Owner of the trademark. */
  holder: string;
  /**
   * How the emblem sits on the colored circle: 'white' turns it into a white
   * silhouette, 'invert' keeps inner details, 'color' leaves it as is.
   */
  tone: 'white' | 'invert' | 'color';
}

/**
 * Emblem in a circle of `color`; `fallback` is shown if the file fails to load.
 * Decorative: the name is always next to it.
 */
export function Emblem({
  entry,
  color,
  size = 'sm',
  fallback = null,
}: {
  entry: EmblemEntry;
  color: string;
  size?: 'sm' | 'lg';
  fallback?: ReactNode;
}) {
  const [broken, setBroken] = useState(false);
  if (broken) return fallback;
  return (
    <span
      className={`team-logo team-logo--${size} team-logo--emblem`}
      style={{ '--team': color } as CSSProperties}
      title={`© ${entry.holder}`}
      aria-hidden="true"
    >
      <img
        className={`team-logo__img team-logo__img--${entry.tone}`}
        src={`${import.meta.env.BASE_URL}logos/${entry.file}`}
        alt=""
        loading="lazy"
        onError={() => setBroken(true)}
      />
    </span>
  );
}
