import { createFavorites } from '../../../hooks/useFavorites';
import { validArticle } from '../../../lib/wikiArticle';

const store = createFavorites('racinghub:fe:favorites', ['drivers', 'teams'] as const, validArticle);

export const readFeFavorites = store.read;
export const toggleFeFavorite = store.toggle;
export const useFeFavorites = store.useFavorites;
