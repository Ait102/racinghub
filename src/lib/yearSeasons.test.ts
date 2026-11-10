// @vitest-environment node
import { seasonArticle as dtmArticle } from '../series/dtm/data/seasons';
import { seasonArticle as imsaArticle } from '../series/imsa/data/seasons';
import { createYearSeasons, yearSeasons } from './yearSeasons';

describe('year-named seasons (IMSA, DTM)', () => {
  const now = new Date('2026-11-09');

  it('lists every year from the first season to the current one, newest first', () => {
    expect(yearSeasons(2014, now)).toHaveLength(13);
    expect(yearSeasons(2014, now).slice(0, 2)).toEqual(['2026', '2025']);
    expect(yearSeasons(2014, now).at(-1)).toBe('2014');
  });

  it('reads the season from the address and rejects unknown ones', () => {
    const imsa = createYearSeasons('imsa', 2014);
    expect(imsa.fromPath('/imsa/2016')).toBe('2016');
    expect(imsa.fromPath('/imsa/2013')).toBeNull();
    expect(imsa.fromPath('/dtm/2016')).toBeNull();
  });

  it('names the Wikipedia season articles as the source does', () => {
    expect(imsaArticle('2014')).toBe('2014 United SportsCar Championship');
    expect(imsaArticle('2016')).toBe('2016 IMSA SportsCar Championship');
    expect(dtmArticle('2026')).toBe('2026 Deutsche Tourenwagen Masters');
  });
});
