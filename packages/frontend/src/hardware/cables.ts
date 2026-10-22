import type { ConnectorKind } from "./cableMesh";

/**
 * Socket anchors on the supplied FortiGate 60F mesh. `x` is the socket centre as a
 * fraction of the model width (centre = 0); every front-panel socket shares one row.
 */
export const PORTS = [
  { id: "power", part: "power", label: "DC+12V", x: -3.349 / 8, color: "#ef4444" },
  { id: "usb", part: "usb", label: "USB", x: -3.004 / 8, color: "#eab308" },
  { id: "console", part: "console", label: "CONSOLE", x: -2.499 / 8, color: "#94a3b8" },
  { id: "wan2", part: "wan2", label: "WAN2", x: -1.809 / 8, color: "#f97316" },
  { id: "wan1", part: "wan1", label: "WAN1", x: -1.321 / 8, color: "#f97316" },
  { id: "dmz", part: "dmz", label: "DMZ", x: -0.811 / 8, color: "#0d9488" },
  { id: "ha-b", part: "ha", label: "HA B", x: -0.290 / 8, color: "#7c3aed" },
  { id: "ha-a", part: "ha", label: "HA A", x: 0.237 / 8, color: "#7c3aed" },
  { id: "lan-5", part: "lan", label: "LAN 5", x: 1.007 / 8, color: "#2563eb" },
  { id: "lan-4", part: "lan", label: "LAN 4", x: 1.560 / 8, color: "#2563eb" },
  { id: "lan-3", part: "lan", label: "LAN 3", x: 2.150 / 8, color: "#2563eb" },
  { id: "lan-2", part: "lan", label: "LAN 2", x: 2.745 / 8, color: "#2563eb" },
  { id: "lan-1", part: "lan", label: "LAN 1", x: 3.356 / 8, color: "#2563eb" },
];

/** Socket row height as a fraction of the unrotated model height, measured from its centre. */
export const PORT_Y = -0.115;
/** Socket width as a fraction of the model width. */
export const SOCKET_WIDTH = 0.06;

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

export function connectorKind(cableId: string): ConnectorKind {
  return cableId === "dc-power" ? "power" : cableId === "usb" ? "usb" : "rj45";
}

/**
 * Physical socket used for each exercise port. Numbered ports use the LAN socket with
 * the same number, then the remaining RJ-45 sockets. The 60F has ten RJ-45 data sockets,
 * so exercise ports beyond that are configured from the port list only.
 */
export const EXERCISE_SOCKETS: Record<string, string> = {
  wan1: "wan1", wan2: "wan2",
  port1: "lan-1", port2: "lan-2", port3: "lan-3", port4: "lan-4", port5: "lan-5",
  port6: "dmz", port7: "ha-a", port8: "ha-b",
};
