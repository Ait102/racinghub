// Favourite F1 drivers and teams (Jolpica ids), kept in localStorage.
import { createFavorites } from '../../../hooks/useFavorites';

export type FavKind = 'drivers' | 'constructors';

const store = createFavorites<FavKind>('racinghub:f1:favorites', ['drivers', 'constructors'], (id) =>
  /^[a-z0-9_]+$/i.test(id),
);

export const readFavorites = store.read;
export const toggleFavorite = store.toggle;
export const useFavorites = store.useFavorites;
