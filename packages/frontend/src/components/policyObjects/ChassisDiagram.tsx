import { useState } from "react";

export type PortZone = "WAN" | "LAN" | "DMZ" | "unassigned";

export interface PortAssignment {
  portId: string;
  label: string;
  zone: PortZone;
  locked?: boolean;
}

interface ChassisDiagramProps {
  ports: PortAssignment[];
  onChange: (portId: string, zone: PortZone) => void;
}

const ZONE_COLORS: Record<PortZone, string> = {
  WAN: "bg-orange-400",
  LAN: "bg-emerald-500",
  DMZ: "bg-blue-400",
  unassigned: "bg-gray-300",
};

const ZONE_TEXT: Record<PortZone, string> = {
  WAN: "text-orange-700 bg-orange-100 border-orange-300",
  LAN: "text-success bg-success-soft border-emerald-300",
  DMZ: "text-info bg-info-soft border-blue-300",
  unassigned: "text-muted bg-sunken border-line-strong",
};

export function ChassisDiagram({ ports, onChange }: ChassisDiagramProps) {
  const [hoveredPort, setHoveredPort] = useState<string | null>(null);
  const internalPorts = ports.filter((p) => p.portId.startsWith("port"));
  const specialPorts = ports.filter((p) => !p.portId.startsWith("port"));

  return (
    <div className="select-none">
      <div className="bg-gray-800 rounded-md p-3 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-gray-300 text-[11px] font-mono font-medium">FortiGate-600F</span>
          </div>
          <span className="text-muted text-[10px] font-mono">SIMULATED</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-1">
            <div className="text-[9px] text-muted text-center font-mono uppercase tracking-wider mb-0.5">INTERNAL</div>
            <div className="flex gap-1">
              {internalPorts.map((port) => (
                <div key={port.portId} onMouseEnter={() => setHoveredPort(port.portId)} onMouseLeave={() => setHoveredPort(null)}>
                  <div
                    className={`w-9 h-9 rounded-sm border border-gray-600 flex flex-col items-center justify-center cursor-pointer transition-all ${hoveredPort === port.portId ? "border-white/50 scale-105" : ""}`}
                    style={{ background: "#1a1a2e" }}
                  >
                    <div className={`w-5 h-5 rounded-sm ${ZONE_COLORS[port.zone]} flex items-center justify-center`}>
                      <span className="text-white text-[9px] font-bold">{port.label}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="w-px h-10 bg-gray-600 mx-1"></div>
          <div className="flex gap-1">
            {specialPorts.map((port) => (
              <div key={port.portId} onMouseEnter={() => setHoveredPort(port.portId)} onMouseLeave={() => setHoveredPort(null)}>
                <div
                  className={`w-10 h-12 rounded-sm border border-gray-600 flex flex-col items-center justify-center cursor-pointer transition-all ${hoveredPort === port.portId ? "border-white/50 scale-105" : ""}`}
                  style={{ background: "#1a1a2e" }}
                >
                  <div className={`w-6 h-6 rounded-sm ${ZONE_COLORS[port.zone]} flex items-center justify-center mb-0.5`}>
                    <span className="text-white text-[8px] font-bold">{port.label}</span>
                  </div>
                  <span className="text-muted text-[8px] font-mono">{port.portId}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="ml-auto flex flex-col gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <div className="w-2 h-2 rounded-full bg-amber-400"></div>
            <div className="w-2 h-2 rounded-full bg-gray-600"></div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="text-[11px] text-muted font-medium uppercase tracking-wider mb-2">Port Zone Assignment</div>
        {ports.map((port) => (
          <div key={port.portId} className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-sm ${ZONE_COLORS[port.zone]} flex items-center justify-center shrink-0`}>
              <span className="text-white text-[9px] font-bold">{port.label}</span>
            </div>
            <span className="text-[12.5px] font-medium text-body w-16">{port.portId}</span>
            {port.locked ? (
              <span className={`text-[11px] px-2 py-0.5 rounded border font-medium ${ZONE_TEXT[port.zone]}`}>{port.zone} (fixed)</span>
            ) : (
              <select
                value={port.zone}
                onChange={(e) => onChange(port.portId, e.target.value as PortZone)}
                className={`text-[12px] px-2 py-1 rounded border font-medium cursor-pointer ${ZONE_TEXT[port.zone]}`}
              >
                <option value="unassigned">Unassigned</option>
                <option value="WAN">WAN</option>
                <option value="LAN">LAN</option>
                <option value="DMZ">DMZ</option>
              </select>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-line">
        {(["WAN", "LAN", "DMZ", "unassigned"] as PortZone[]).map((zone) => (
          <div key={zone} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${ZONE_COLORS[zone]}`}></div>
            <span className="text-[11px] text-muted">{zone}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
