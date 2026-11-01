import entries2012 from '../__fixtures__/season-2012-entries.html?raw';
import entries1920 from '../__fixtures__/season-2019-20-entries.html?raw';
import entries2026 from '../__fixtures__/season-2026-entries.html?raw';
import { parseParticipants } from './participants';

describe('season entry lists', () => {
  it.each([entries2026, entries2012, entries1920])(
    'reads crews across rowspan rows before any results',
    (html) => {
      const people = parseParticipants(html, true);
      const teams = parseParticipants(html, false);
      expect(people.length).toBeGreaterThan(50);
      expect(teams.length).toBeGreaterThan(8);
      expect(people.some((p) => p.who.article === 'Sébastien Buemi')).toBe(true);
      expect(people.every((p) => p.categories.length > 0)).toBe(true);
      expect(new Set(people.map((p) => p.who.article ?? p.who.name)).size).toBe(people.length);
      expect(people.find((p) => p.who.article === 'Sébastien Buemi')?.who.flag).not.toBeNull();
    },
    20_000,
  );
});
