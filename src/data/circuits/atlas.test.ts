// @vitest-environment node
import { atlasCircuit, f1dbCurrentLayout } from './atlas';

it('finds present-day outlines by article or short name, and nothing for circuits it lacks', () => {
  expect(atlasCircuit('Daytona International Speedway')).toMatchObject({
    layoutName: 'Road Course',
    layout: { lengthKm: 5.729, turns: 12, direction: 'anticlockwise' },
  });
  expect(atlasCircuit(null, 'Road Atlanta')?.layoutName).toBe('Full Course');
  expect(atlasCircuit('Circuit Zandvoort')?.layout.source?.license).toBe('ODbL');
  expect(atlasCircuit('Lausitzring')).toBeNull();
});

it('adds outlines traced from Commons maps, with their own licence, and F1 layouts by name', async () => {
  expect(atlasCircuit('Norisring')).toMatchObject({
    layout: { lengthKm: 2.3, turns: 8, source: { license: 'CC BY-SA 3.0' } },
  });
  // Oschersleben's infobox gives no number of turns: none is shown.
  expect(atlasCircuit('Motorsport Arena Oschersleben')?.layout.turns).toBeUndefined();
  expect((await f1dbCurrentLayout('Hockenheimring'))?.layout.lengthKm).toBe(4.574);
  expect(await f1dbCurrentLayout('Norisring')).toBeNull();
});
