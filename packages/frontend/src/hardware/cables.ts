/** Model-local socket anchors for the supplied FortiGate mesh, normalized to its bounds. */
export const PORTS = [
  { id: "power", part: "power", x: -3.349 / 8, color: "#ef4444" },
  { id: "usb", part: "usb", x: -3.004 / 8, color: "#eab308" },
  { id: "console", part: "console", x: -2.499 / 8, color: "#94a3b8" },
  { id: "wan2", part: "wan2", x: -1.809 / 8, color: "#f97316" },
  { id: "wan1", part: "wan1", x: -1.321 / 8, color: "#f97316" },
  { id: "dmz", part: "dmz", x: -0.811 / 8, color: "#0d9488" },
  { id: "ha-b", part: "ha", x: -0.290 / 8, color: "#7c3aed" },
  { id: "ha-a", part: "ha", x: 0.237 / 8, color: "#7c3aed" },
  { id: "lan-5", part: "lan", x: 1.007 / 8, color: "#2563eb" },
  { id: "lan-4", part: "lan", x: 1.560 / 8, color: "#2563eb" },
  { id: "lan-3", part: "lan", x: 2.150 / 8, color: "#2563eb" },
  { id: "lan-2", part: "lan", x: 2.745 / 8, color: "#2563eb" },
  { id: "lan-1", part: "lan", x: 3.356 / 8, color: "#2563eb" },
];

export const CABLE_TYPES = [
  { id: "dc-power", label: "12V DC Power", color: "#ef4444", accepts: ["power"], desc: "DC barrel connector for the power input." },
  { id: "usb", label: "USB Cable", color: "#eab308", accepts: ["usb"], desc: "USB Type-A connector for supported USB accessories." },
  { id: "console", label: "Console Cable", color: "#94a3b8", accepts: ["console"], desc: "RJ-45 serial console cable; not an Ethernet link." },
  { id: "rj45-wan", label: "RJ-45 WAN", color: "#f97316", accepts: ["wan1", "wan2"], desc: "ISP Ethernet uplink — WAN1 or WAN2." },
  { id: "rj45-lan", label: "RJ-45 LAN", color: "#2563eb", accepts: ["lan"], desc: "Internal network patch cable — numbered LAN ports." },
  { id: "rj45-dmz", label: "RJ-45 DMZ", color: "#0d9488", accepts: ["dmz"], desc: "Ethernet cable for the DMZ network." },
  { id: "rj45-ha", label: "HA Cable", color: "#7c3aed", accepts: ["ha"], desc: "Ethernet heartbeat cable for the HA practice ports." },
];

export function acceptsCable(cableId: string, portId: string): boolean {
  const port = PORTS.find(port => port.id === portId);
  return !!port && !!CABLE_TYPES.find(cable => cable.id === cableId)?.accepts.includes(port.part);
}
