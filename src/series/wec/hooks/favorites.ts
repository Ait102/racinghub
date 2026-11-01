// Favourite WEC drivers and teams, by Wikipedia article title (spaces, diacritics and "/" allowed).
import { createFavorites } from '../../../hooks/useFavorites';
import { validArticle } from '../domain/profiles';

export type WecFavKind = 'drivers' | 'teams';

const store = createFavorites<WecFavKind>('racinghub:wec:favorites', ['drivers', 'teams'], validArticle);

export const readWecFavorites = store.read;
export const toggleWecFavorite = store.toggle;
export const useWecFavorites = store.useFavorites;
