import { PanSession } from "../../hooks/usePanSession";
import { PanChassisDiagram, PanPortAssignment } from "../../components/policyObjects/PanChassisDiagram";

const REFERENCE_PORTS: PanPortAssignment[] = [
  { id:"ethernet1/1", zone:"Untrust", label:"eth1/1" },
  { id:"ethernet1/2", zone:"Untrust", label:"eth1/2" },
  { id:"ethernet1/3", zone:"Untrust", label:"eth1/3" },
  { id:"ethernet1/4", zone:"Untrust", label:"eth1/4" },
  { id:"ethernet1/5", zone:"Trust", label:"eth1/5" },
  { id:"ethernet1/6", zone:"Trust", label:"eth1/6" },
  { id:"ethernet1/7", zone:"Trust", label:"eth1/7" },
  { id:"ethernet1/8", zone:"Trust", label:"eth1/8" },
  { id:"management", zone:"Management", label:"MGT" },
];

export function PanDashboard({ session: _session }: { session: PanSession }) {
  return (
    <div style={{ width:"100%", height:"calc(100vh - 84px)", display:"flex", flexDirection:"column", gap:8 }}>
      <div style={{ flexShrink:0 }}>
        <h1 style={{ fontSize:15, fontWeight:650, color:"#1e293b", margin:"0 0 2px" }}>PA-220 — Interactive Hardware Reference</h1>
        <p style={{ color:"#64748b", fontSize:12, margin:0 }}>Auto-rotates · drag to inspect · scroll to zoom · click any port or the chassis to learn</p>
      </div>
      <div style={{ flex:1, minHeight:0 }}>
        <PanChassisDiagram ports={REFERENCE_PORTS} onChange={() => {}} referenceMode fullHeight />
      </div>
    </div>
  );
}
