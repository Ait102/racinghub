import { readFeFavorites, toggleFeFavorite } from './favorites';

it('stores FE articles separately and rejects corrupted titles', () => {
  localStorage.clear();
  const other = JSON.stringify({ drivers: ['Sébastien Buemi'], teams: [] });
  localStorage.setItem('racinghub:wec:favorites', other);
  localStorage.setItem('racinghub:fe:favorites', JSON.stringify({ drivers: ['x:y', '', 4], teams: [] }));
  expect(readFeFavorites().drivers).toEqual([]);
  toggleFeFavorite('drivers', 'António Félix da Costa');
  expect(readFeFavorites().drivers).toEqual(['António Félix da Costa']);
  expect(localStorage.getItem('racinghub:wec:favorites')).toBe(other);
  toggleFeFavorite('drivers', 'António Félix da Costa');
  expect(readFeFavorites().drivers).toEqual([]);
});
