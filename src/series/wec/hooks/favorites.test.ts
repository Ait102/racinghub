import { readWecFavorites, toggleWecFavorite } from './favorites';

beforeEach(() => localStorage.clear());

describe('WEC favorites', () => {
  it('keep article titles with spaces, diacritics and "/" apart from F1', () => {
    const f1 = JSON.stringify({ drivers: ['hamilton'], constructors: [] });
    localStorage.setItem('racinghub:f1:favorites', f1);
    toggleWecFavorite('drivers', 'Sébastien Buemi');
    toggleWecFavorite('teams', 'AF Corse/Ferrari');
    expect(readWecFavorites()).toEqual({ drivers: ['Sébastien Buemi'], teams: ['AF Corse/Ferrari'] });
    expect(localStorage.getItem('racinghub:f1:favorites')).toBe(f1);
    toggleWecFavorite('drivers', 'Sébastien Buemi');
    expect(readWecFavorites().drivers).toEqual([]);
  });

  it('drop invalid titles from storage', () => {
    localStorage.setItem(
      'racinghub:wec:favorites',
      JSON.stringify({ drivers: ['Kamui Kobayashi', 'a|b', 'x:y', '', 7], teams: 'bad' }),
    );
    expect(readWecFavorites()).toEqual({ drivers: ['Kamui Kobayashi'], teams: [] });
  });
});
