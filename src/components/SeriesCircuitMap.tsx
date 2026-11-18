import { atlasCircuit } from '../data/circuits/atlas';
import { CircuitLayoutPanel } from './CircuitMap';

/** Present-day outline of an IMSA/DTM circuit, when the atlas has it; nothing otherwise. */
export function SeriesCircuitMap({
  names,
  title,
}: {
  names: Array<string | null | undefined>;
  title: string | null;
}) {
  const found = atlasCircuit(...names);
  if (!found) return null;
  return (
    <CircuitLayoutPanel shape={found.layout} name={title}>
      <p className="muted small">Современная конфигурация: {found.layoutName}.</p>
    </CircuitLayoutPanel>
  );
}
