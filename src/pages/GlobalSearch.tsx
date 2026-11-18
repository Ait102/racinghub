import { useEffect, useId, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { searchHub } from '../lib/hub';
import { HUB_LABELS, useHubs } from './hubs';

/** Header search for drivers and teams of every championship (current seasons). */
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const hubs = useHubs(open);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  // A new page closes the search.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const results = hubs ? searchHub(hubs.hubs, query) : [];
  const go = (to: string) => {
    setOpen(false);
    setQuery('');
    navigate(to);
  };

  return (
    <div className="site-search">
      <button
        type="button"
        className="site-search__toggle"
        aria-expanded={open}
        aria-controls={`${listId}-panel`}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
          <path d="M15.5 15.5 21 21" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        <span className="site-search__label">Поиск</span>
      </button>
      {open && (
        <div className="site-search__panel" id={`${listId}-panel`}>
          <input
            ref={input}
            type="search"
            role="combobox"
            aria-label="Пилот, команда или трасса любого чемпионата"
            aria-expanded={results.length > 0}
            aria-controls={listId}
            aria-activedescendant={results.length ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            placeholder="Пилот, команда или трасса…"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
              else if (e.key === 'ArrowDown' && results.length) {
                e.preventDefault();
                setActive((a) => (a + 1) % results.length);
              } else if (e.key === 'ArrowUp' && results.length) {
                e.preventDefault();
                setActive((a) => (a - 1 + results.length) % results.length);
              } else if (e.key === 'Enter' && results[active]) go(results[active].to);
            }}
          />
          {!hubs ? (
            <p className="site-search__hint muted small" role="status">
              Загружаем участников текущих сезонов…
            </p>
          ) : query.trim().length < 2 ? (
            <p className="site-search__hint muted small">
              Пилоты, команды и трассы текущих сезонов: {hubs.hubs.map((h) => h.label).join(', ')}.
            </p>
          ) : results.length === 0 ? (
            <p className="site-search__hint muted small" role="status">
              Никого не нашли.
            </p>
          ) : null}
          {hubs && hubs.failed.length > 0 && (
            <p className="site-search__hint muted small">
              Не загрузились: {hubs.failed.map((id) => HUB_LABELS[id]).join(', ')}.
            </p>
          )}
          <ul className="site-search__list" id={listId} role="listbox" aria-label="Найдено">
            {results.map((r, i) => (
              <li
                key={`${r.hub.series}-${r.kind}-${r.name}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className="site-search__item"
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(r.to)}
              >
                <span className={`site-search__series site-search__series--${r.hub.series}`}>
                  {r.hub.label}
                </span>
                <span className="site-search__name">{r.name}</span>
                <span className="muted small">
                  {r.kind === 'driver' ? 'пилот' : r.kind === 'team' ? 'команда' : 'трасса'}
                  {r.note ? ` · ${r.note}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
