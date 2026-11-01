// Favourites kept in localStorage (per browser), one store per series with its own key.
import { useCallback, useSyncExternalStore } from 'react';

export function createFavorites<K extends string>(
  key: string,
  kinds: readonly K[],
  validId: (id: string) => boolean,
) {
  type Favorites = Record<K, string[]>;
  const event = `${key}-change`;
  const empty = Object.fromEntries(kinds.map((k) => [k, []])) as unknown as Favorites;

  let cachedRaw: string | null | undefined;
  let cachedValue: Favorites = empty;

  function sanitize(v: unknown): Favorites {
    const r = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
    const ids = (x: unknown) =>
      Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string' && validId(s)) : [];
    return Object.fromEntries(kinds.map((k) => [k, ids(r[k])])) as unknown as Favorites;
  }

  function read(): Favorites {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return empty;
    }
    // Stable snapshot for useSyncExternalStore: same string → same object.
    if (raw === cachedRaw) return cachedValue;
    cachedRaw = raw;
    try {
      cachedValue = raw ? sanitize(JSON.parse(raw)) : empty;
    } catch {
      cachedValue = empty;
    }
    return cachedValue;
  }

  function write(next: Favorites): void {
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* storage unavailable: favourites just don't persist */
    }
    window.dispatchEvent(new Event(event));
  }

  function toggle(kind: K, id: string): void {
    const cur = read();
    const list = cur[kind];
    write({ ...cur, [kind]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] });
  }

  function subscribe(cb: () => void): () => void {
    window.addEventListener(event, cb);
    window.addEventListener('storage', cb); // other tabs
    return () => {
      window.removeEventListener(event, cb);
      window.removeEventListener('storage', cb);
    };
  }

  function useFavorites() {
    const favs = useSyncExternalStore(subscribe, read, () => empty);
    const isFav = useCallback((kind: K, id: string) => favs[kind].includes(id), [favs]);
    return { favs, isFav, toggle };
  }

  return { read, toggle, useFavorites };
}
