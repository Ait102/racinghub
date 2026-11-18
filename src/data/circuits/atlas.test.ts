// @vitest-environment node
import { atlasCircuit } from './atlas';

it('finds present-day outlines by article or short name, and nothing for circuits it lacks', () => {
  expect(atlasCircuit('Daytona International Speedway')).toMatchObject({
    layoutName: 'Road Course',
    layout: { lengthKm: 5.729, turns: 12, direction: 'anticlockwise' },
  });
  expect(atlasCircuit(null, 'Road Atlanta')?.layoutName).toBe('Full Course');
  expect(atlasCircuit('Circuit Zandvoort')?.layout.source?.license).toBe('ODbL');
  expect(atlasCircuit('Norisring')).toBeNull();
});
