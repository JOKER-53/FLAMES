import { useEffect, useState } from "react";
import { ipMatchesAddressValue, type AddressObject, type TestPacket } from "@fortisim/engine";

interface NetworkTopologyProps {
  addresses: AddressObject[];
  packets?: TestPacket[];
  highlightSystemIds?: string[];
  activeFlow?: {
    srcZone: "WAN" | "LAN" | "DMZ";
    dstZone: "WAN" | "LAN" | "DMZ";
    action: "ACCEPT" | "DENY";
  } | null;
}

interface SystemNode {
  id: string;
  address: AddressObject;
  zone: string;
}

function endpointZone(addr: AddressObject, packets: TestPacket[]): string {
  const zones = new Set<string>();
  for (const packet of packets) {
    for (const [ip, zone] of [[packet.srcIp, packet.srcIntf], [packet.dstIp, packet.dstIntf]]) {
      try { if (ipMatchesAddressValue(ip, addr.type, addr.value)) zones.add(zone); } catch { /* Invalid or unsupported objects have no inferred zone. */ }
    }
  }
  return zones.size === 1 ? [...zones][0] : zones.size > 1 ? "Multiple zones" : "Unspecified";
}

const CANVAS_STYLE: React.CSSProperties = {
  backgroundColor: "rgb(var(--sunken))",
  backgroundImage: "radial-gradient(rgb(var(--line-strong)) 1px, transparent 1px)",
  backgroundSize: "16px 16px",
};

function ConnectorDot({ color = "#6b7280" }: { color?: string }) {
  return <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />;
}

const ZONE_DOTS: Record<string, string> = { WAN: "#fb923c", LAN: "#10b981", DMZ: "#60a5fa", "Multiple zones": "#64748b", Unspecified: "#64748b" };

export function NetworkTopology({ addresses, packets = [], highlightSystemIds = [], activeFlow = null }: NetworkTopologyProps) {
  const systems: SystemNode[] = addresses
    .filter((a) => a.value.toLowerCase() !== "all" && a.value !== "0.0.0.0/0")
    .map((a) => ({ id: a.id, address: a, zone: endpointZone(a, packets) }));

  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!activeFlow) {
      setPhase(0);
      return;
    }
    setPhase(1);
    const t1 = setTimeout(() => setPhase(2), 400);
    const t2 = setTimeout(() => setPhase(3), 800);
    const t3 = setTimeout(() => setPhase(4), 1300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [activeFlow]);

  return (
    <section aria-label="Network topology" className="bg-surface border border-line rounded-md p-4 min-w-0">
      <div className="text-[12px] font-medium text-body mb-3 uppercase tracking-wide">Network Topology</div>

      <div className="relative rounded border border-line p-4" style={CANVAS_STYLE}>
        {/* Endpoints wrap within the sidebar; the diagram represents logical zones. */}
        <div className="flex flex-col items-center gap-3">

          {/* Endpoint grid */}
          <div className="flex flex-wrap items-end justify-center gap-x-3 gap-y-4 w-full">
            {systems.map((sys) => {
              const highlighted = highlightSystemIds.includes(sys.id);
              const zone = sys.zone;
              return (
                <div key={sys.id} data-topology-device={sys.id} className="flex flex-col items-center gap-1 min-w-0 w-[calc(50%-0.375rem)]">
                  <div
                    className={`relative w-14 h-11 rounded-sm bg-surface border-2 flex items-center justify-center shadow-sm transition-all ${
                      highlighted ? "border-forti-red scale-110" : "border-gray-400"
                    }`}
                  >
                    <svg width="26" height="20" viewBox="0 0 26 20">
                      <rect x="1" y="1" width="24" height="14" rx="1" fill="#e5e7eb" stroke="currentColor" strokeWidth="1.5" className={highlighted ? "text-forti-red" : "text-muted"} />
                      <rect x="9" y="16" width="8" height="2" fill="currentColor" className={highlighted ? "text-forti-red" : "text-muted"} />
                      <rect x="6" y="18" width="14" height="1.5" rx="0.5" fill="currentColor" className={highlighted ? "text-forti-red" : "text-muted"} />
                    </svg>
                    {highlighted && <div className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-forti-red animate-pulse"></div>}
                  </div>
                  <div title={sys.address.name} className={`text-[11px] text-center break-words w-full font-semibold ${highlighted ? "text-forti-red" : "text-body"}`}>{sys.address.name}</div>
                  <div className="text-[10px] text-muted font-mono text-center break-all w-full">{sys.address.value.split("/")[0]}</div>
                  <div className="text-[8px] font-bold px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: ZONE_DOTS[zone] }}>{zone}</div>
                  {/* Cable down to firewall */}
                  <ConnectorDot color={ZONE_DOTS[zone]} />
                  <div className="relative">
                    <div className="w-px h-6" style={{ backgroundColor: ZONE_DOTS[zone] }}></div>
                    {activeFlow && activeFlow.srcZone === zone && (phase === 1 || phase === 2) && (
                      <div
                        className="absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-forti-red shadow"
                        style={{ top: phase === 1 ? "0px" : "18px", transition: "top 0.4s ease-in" }}
                      />
                    )}
                    {activeFlow && activeFlow.dstZone === zone && (phase === 3 || phase === 4) && (
                      <div
                        className={`absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full shadow ${activeFlow.action === "ACCEPT" ? "bg-emerald-500" : "bg-red-500"}`}
                        style={{ top: phase === 3 ? "18px" : "0px", transition: "top 0.5s ease-out" }}
                      />
                    )}
                  </div>
                  <ConnectorDot color={ZONE_DOTS[zone]} />
                </div>
              );
            })}
          </div>

          {/* FortiGate in center */}
          <div className={`border-2 rounded-md px-4 py-2 bg-surface flex items-center gap-2 shadow-sm transition-all ${activeFlow && phase === 2 ? "scale-110" : ""} border-forti-red`}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M9 1.5 15 3.5v5c0 4-3 6.5-6 8-3-1.5-6-4-6-8v-5L9 1.5Z" fill="#fee2e2" stroke="#DA291C" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
            <span className="text-[11px] font-bold text-forti-red">FortiGate</span>
          </div>

          {activeFlow && phase === 4 && (
            <div className={`text-[10.5px] font-bold px-2 py-0.5 rounded ${activeFlow.action === "ACCEPT" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
              {activeFlow.action === "ACCEPT" ? "✓ ACCEPTED" : "✕ DENIED"}
            </div>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">Logical endpoints · zones come from the exercise test packets. This diagram does not infer physical cabling.</p>
    </section>
  );
}
