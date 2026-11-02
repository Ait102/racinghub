// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { loadCircuit } from '../../../data/circuits';
import { findWecCircuit, loadWecCircuit } from './circuits';

describe('WEC circuit selection', () => {
  it.each([
    ['Circuit_de_la_Sarthe', 'sarthe'],
    ['24 Hours of Le Mans', 'sarthe'],
    ['2026 6 Hours of Fuji', 'fuji'],
    ['Lone Star Le Mans', 'austin'],
    ['Autodromo Nazionale di Monza', 'monza'],
    ['Autódromo José Carlos Pace', 'interlagos'],
    ['6 Hours of Sao Paulo', 'interlagos'],
    ['Losail International Circuit', 'lusail'],
    ['8 Hours of Portimao', 'portimao'],
  ])('recognizes article alias %s', (article, slug) => {
    expect(findWecCircuit(article)?.slug).toBe(slug);
  });

  it('uses the modern Fuji layout throughout the WEC era, independent of F1 visits', async () => {
    expect(await loadWecCircuit('Fuji Speedway', '2012')).toMatchObject({ lengthKm: 4.563, turns: 16 });
    expect(await loadWecCircuit('6 Hours of Fuji', '2019-20')).toMatchObject({ lengthKm: 4.563, turns: 16 });
    expect(await loadWecCircuit('Fuji Speedway', '2026')).toMatchObject({ lengthKm: 4.563, turns: 16 });
    expect(await loadCircuit('fuji', 2026)).toBeNull();
  });

  it('uses the WEC Grand Prix route at Bahrain even in F1 alternative-layout years', async () => {
    const shape = await loadWecCircuit('Bahrain International Circuit', '2019-20');
    expect(shape).toMatchObject({ lengthKm: 5.412, turns: 15 });
    expect(shape!.d).not.toBe((await loadCircuit('bahrain', 2020))?.d);
  });

  it('does not confuse the WEC Sebring route with the 1959 F1 circuit', async () => {
    const shape = await loadWecCircuit('Sebring International Raceway', '2012');
    expect(shape).toMatchObject({ lengthKm: 6.019, turns: 17, source: { license: 'ODbL' } });
    expect(shape!.d).not.toBe((await loadCircuit('sebring', 1959))!.d);
  });

  it('uses the verified current Le Mans route without substituting it for an unknown old map', async () => {
    expect(await loadWecCircuit('24 Hours of Le Mans', '2026')).toMatchObject({
      lengthKm: 13.626,
      turns: 38,
    });
    expect(await loadWecCircuit('24 Hours of Le Mans', '2012')).toBeNull();
    expect(await loadWecCircuit('24 Hours of Le Mans', '2018-19', 2018)).not.toBeNull();
  });

  it('follows historical configurations instead of always selecting the newest common layout', async () => {
    const old = await loadWecCircuit('Circuit de Barcelona-Catalunya', '2012');
    const current = await loadWecCircuit('Circuit de Barcelona-Catalunya', '2026');
    expect(old).toMatchObject({ lengthKm: 4.655, turns: 16 });
    expect(current).toMatchObject({ lengthKm: 4.657, turns: 14 });
    expect(old!.d).not.toBe(current!.d);
  });

  it('keeps the WEC-specific Nürburgring chicane separate from F1', async () => {
    expect(await loadWecCircuit('6 Hours of Nürburgring', '2016')).toBeNull();
  });

  it.each([
    ['Imola Circuit', 4.909],
    ['Circuit de Spa-Francorchamps', 7.004],
    ['Interlagos Circuit', 4.309],
    ['Circuit of the Americas', 5.513],
    ['Lusail International Circuit', 5.419],
    ['Monza Circuit', 5.793],
    ['Algarve International Circuit', 4.653],
    ['Silverstone Circuit', 5.891],
    ['Shanghai International Circuit', 5.451],
    ['Autódromo Hermanos Rodríguez', 4.304],
  ])('loads known common geometry for %s', async (article, lengthKm) => {
    expect(await loadWecCircuit(article, '2026')).toMatchObject({ lengthKm });
  });

  it('returns null for unknown articles, invalid years and years outside the verified snapshot', async () => {
    expect(findWecCircuit('Bugatti Circuit')).toBeNull();
    expect(await loadWecCircuit('Unknown track', '2026')).toBeNull();
    expect(await loadWecCircuit(null, '2026')).toBeNull();
    expect(await loadWecCircuit('Fuji Speedway', 'bad')).toBeNull();
    expect(await loadWecCircuit('Fuji Speedway', '2011')).toBeNull();
    expect(await loadWecCircuit('Fuji Speedway', '2027')).toBeNull();
  });
});
