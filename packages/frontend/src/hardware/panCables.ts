import type { ConnectorKind } from "./cableMesh";

/** PA-220 sockets, keyed by id, mapped to the named mesh in pa-220-firewall.glb. */
export const PAN_SOCKETS = [
  ...Array.from({ length: 8 }, (_, i) => ({ id: `ethernet1/${i + 1}`, node: `eth1_${i + 1}_housing`, part: "data", label: `ETH 1/${i + 1}`, short: `1/${i + 1}`, upper: i % 2 === 0 })),
  { id: "management",    node: "mgt_housing",          part: "management", label: "MGT",            short: "MGT",  upper: true },
  { id: "console",       node: "console_rj45_housing", part: "console",    label: "CONSOLE (RJ-45)", short: "CON",  upper: false },
  { id: "micro-console", node: "micro_usb_shell",      part: "micro-usb",  label: "CONSOLE (µUSB)",  short: "µUSB", upper: false },
  { id: "usb",           node: "usb_a_shell",          part: "usb",        label: "USB",            short: "USB",  upper: false },
  { id: "pwr1",          node: "pwr1_barrel",          part: "power",      label: "PWR 1 (rear)",   short: "PWR1", upper: false },
  { id: "pwr2",          node: "pwr2_barrel",          part: "power",      label: "PWR 2 (rear)",   short: "PWR2", upper: false },
];

export const PAN_CABLE_TYPES = [
  { id: "pan-power",   label: "12V DC Power",      color: "#ef4444", accepts: ["power"],      kind: "power" as ConnectorKind, desc: "Barrel connector for the rear DC inputs. Two inputs allow redundant power adapters." },
  { id: "pan-data",    label: "RJ-45 Data",        color: "#2563eb", accepts: ["data"],       kind: "rj45" as ConnectorKind,  desc: "Ethernet patch cable for data-plane interfaces ethernet1/1–1/8." },
  { id: "pan-mgmt",    label: "RJ-45 Management",  color: "#a855f7", accepts: ["management"], kind: "rj45" as ConnectorKind,  desc: "Out-of-band management network cable for the dedicated MGT port." },
  { id: "pan-console", label: "RJ-45 Console",     color: "#94a3b8", accepts: ["console"],    kind: "rj45" as ConnectorKind,  desc: "Rollover serial console cable (9600 8N1); not an Ethernet link." },
  { id: "pan-microusb",label: "Micro-USB Console", color: "#14b8a6", accepts: ["micro-usb"],  kind: "usb" as ConnectorKind,   desc: "Micro-USB serial console, an alternative to the RJ-45 console port." },
  { id: "pan-usb",     label: "USB Drive",         color: "#eab308", accepts: ["usb"],        kind: "usb" as ConnectorKind,   desc: "USB Type-A drive for bootstrapping or support workflows." },
];

export function panAcceptsCable(cableId: string, socketId: string): boolean {
  const socket = PAN_SOCKETS.find(s => s.id === socketId);
  return !!socket && !!PAN_CABLE_TYPES.find(c => c.id === cableId)?.accepts.includes(socket.part);
}
