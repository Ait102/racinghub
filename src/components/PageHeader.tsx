import type { ReactNode } from 'react';

/** Page title block: eyebrow, h1, extra content and an optional aside (e.g. a photo). */
export function PageHeader({
  eyebrow,
  title,
  children,
  aside,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  /** Shown on the right (below on phones), e.g. a photo. */
  aside?: ReactNode;
}) {
  const main = (
    <>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {children}
    </>
  );
  if (!aside) return <header className="page-header">{main}</header>;
  return (
    <header className="page-header page-header--aside">
      <div className="page-header__main">{main}</div>
      <div className="page-header__aside">{aside}</div>
    </header>
  );
}
