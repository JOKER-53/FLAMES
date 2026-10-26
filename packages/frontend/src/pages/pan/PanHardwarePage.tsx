import type { PanSession } from "../../hooks/usePanSession";
import { PanApplianceViewer } from "../../hardware/PanApplianceViewer";

export function PanHardwarePage({ session: _session }: { session: PanSession }) {
  return <PanApplianceViewer />;
}
