/**
 * Palo Alto PA-220 Port Positions (Calibrated to 3D Mesh)
 *
 * x / y are normalized fractions of the model's bounding box (-0.5 to +0.5).
 * Calibrated against the PA-220 physical front panel layout:
 *   - Column 1 (Data 1/2): x = -0.305
 *   - Column 2 (Data 3/4): x = -0.235
 *   - Column 3 (Data 5/6): x = -0.165
 *   - Column 4 (Data 7/8): x = -0.095
 *   - Column 5 (MGT/Console): x = -0.025
 *   - Column 6 (Micro-USB): x = +0.055
 *   - Column 7 (USB 3.0): x = +0.125
 *   - Top row Y = +0.050 (Ports 1, 3, 5, 7, MGT)
 *   - Bottom row Y = -0.095 (Ports 2, 4, 6, 8, Console, Micro-USB, USB)
 *   - Rear Panel (PWR 1/2): x = ±0.150 on the rear face
 */

export interface PanPort {
  id: string;
  name: string;
  part: string;
  x: number;
  y: number;
  isRear?: boolean;
  color: string;
  desc: string;
}

export interface PanCableType {
  id: string;
  label: string;
  color: string;
  accepts: string[];
  desc: string;
}

export const PAN_PORTS: PanPort[] = [
  // ── Column 1: Ports 1 & 2 (Leftmost Data RJ-45) ──────────────────────────
  {
    id: "eth1_1",
    name: "Ethernet 1/1 (WAN / Untrust)",
    part: "data-wan",
    x: -0.305,
    y: 0.050,
    color: "#f97316",
    desc: "10/100/1000 RJ-45 port (Port 1, top). Typically configured as Untrust (Internet uplink) with NAT."
  },
  {
    id: "eth1_2",
    name: "Ethernet 1/2 (LAN / Trust)",
    part: "data-lan",
    x: -0.305,
    y: -0.095,
    color: "#2563eb",
    desc: "10/100/1000 RJ-45 port (Port 2, bottom). Typically configured as Trust (internal campus/office LAN)."
  },

  // ── Column 2: Ports 3 & 4 ────────────────────────────────────────────────
  {
    id: "eth1_3",
    name: "Ethernet 1/3 (DMZ)",
    part: "data-dmz",
    x: -0.235,
    y: 0.050,
    color: "#0d9488",
    desc: "10/100/1000 RJ-45 port (Port 3, top). Demilitarized zone for public web/mail servers."
  },
  {
    id: "eth1_4",
    name: "Ethernet 1/4 (HA1 Control)",
    part: "data-ha1",
    x: -0.235,
    y: -0.095,
    color: "#8b5cf6",
    desc: "10/100/1000 RJ-45 port (Port 4, bottom). HA1 Control link for heartbeat and config synchronization."
  },

  // ── Column 3: Ports 5 & 6 ────────────────────────────────────────────────
  {
    id: "eth1_5",
    name: "Ethernet 1/5 (HA2 Data Sync)",
    part: "data-ha2",
    x: -0.165,
    y: 0.050,
    color: "#a855f7",
    desc: "10/100/1000 RJ-45 port (Port 5, top). HA2 Data link for live firewall session state synchronization."
  },
  {
    id: "eth1_6",
    name: "Ethernet 1/6",
    part: "data-lan",
    x: -0.165,
    y: -0.095,
    color: "#3b82f6",
    desc: "10/100/1000 RJ-45 port (Port 6, bottom). General-purpose data interface or isolated guest subnet."
  },

  // ── Column 4: Ports 7 & 8 ────────────────────────────────────────────────
  {
    id: "eth1_7",
    name: "Ethernet 1/7",
    part: "data-lan",
    x: -0.095,
    y: 0.050,
    color: "#60a5fa",
    desc: "10/100/1000 RJ-45 port (Port 7, top). General-purpose data interface."
  },
  {
    id: "eth1_8",
    name: "Ethernet 1/8",
    part: "data-lan",
    x: -0.095,
    y: -0.095,
    color: "#60a5fa",
    desc: "10/100/1000 RJ-45 port (Port 8, bottom). General-purpose data interface."
  },

  // ── Column 5: Management & Serial Console (RJ-45) ─────────────────────────
  {
    id: "mgt",
    name: "MGT (Out-of-Band Management)",
    part: "mgt",
    x: -0.025,
    y: 0.050,
    color: "#10b981",
    desc: "Dedicated 10/100/1000 RJ-45 OOB MGT port (default IP 192.168.1.1) — completely isolated from data plane."
  },
  {
    id: "console",
    name: "Console (RJ-45 Serial)",
    part: "console",
    x: -0.025,
    y: -0.095,
    color: "#94a3b8",
    desc: "RJ-45 serial console (9600 baud, 8-N-1) for direct CLI access via rollover serial cable."
  },

  // ── Column 6 & 7: Micro-USB Console & USB 3.0 ─────────────────────────────
  {
    id: "micro_usb",
    name: "Micro-USB Console",
    part: "micro-usb",
    x: 0.055,
    y: -0.095,
    color: "#eab308",
    desc: "Micro-USB console port — connect directly with a standard Micro-USB cable without serial adapters."
  },
  {
    id: "usb",
    name: "USB 3.0 Port",
    part: "usb",
    x: 0.125,
    y: -0.095,
    color: "#06b6d4",
    desc: "USB 3.0 port for PAN-OS bootstrap configuration XML, system recovery images, and export logs."
  },

  // ── Rear Panel: Redundant 12V DC Power Inputs ────────────────────────────
  {
    id: "pwr1",
    name: "PWR 1 (Primary 12V DC)",
    part: "power",
    x: -0.150,
    y: 0.00,
    isRear: true,
    color: "#ef4444",
    desc: "Primary 12V DC barrel power input on the rear panel. PA-220 supports dual power bricks for redundancy."
  },
  {
    id: "pwr2",
    name: "PWR 2 (Redundant 12V DC)",
    part: "power",
    x: 0.150,
    y: 0.00,
    isRear: true,
    color: "#dc2626",
    desc: "Secondary redundant 12V DC barrel power input on the rear panel for uninterrupted failover."
  }
];

export const PAN_CABLE_TYPES: PanCableType[] = [
  {
    id: "rj45-wan",
    label: "RJ-45 WAN (Untrust)",
    color: "#f97316",
    accepts: ["data-wan", "data-lan"],
    desc: "Category 6 Ethernet patch cable connecting to ISP gateway or CPE uplink router."
  },
  {
    id: "rj45-lan",
    label: "RJ-45 LAN (Trust)",
    color: "#2563eb",
    accepts: ["data-lan", "data-wan"],
    desc: "Category 6 Ethernet patch cable connecting to internal corporate switch infrastructure."
  },
  {
    id: "rj45-dmz",
    label: "RJ-45 DMZ",
    color: "#0d9488",
    accepts: ["data-dmz", "data-lan"],
    desc: "Isolated Ethernet link connecting to demilitarized server zone switches."
  },
  {
    id: "rj45-ha1",
    label: "HA1 Control Cable",
    color: "#8b5cf6",
    accepts: ["data-ha1", "data-lan"],
    desc: "Direct peer-to-peer Ethernet cable between PA-220 firewalls for HA control heartbeat."
  },
  {
    id: "rj45-ha2",
    label: "HA2 Data Sync Cable",
    color: "#a855f7",
    accepts: ["data-ha2", "data-lan"],
    desc: "Direct peer-to-peer Ethernet cable between PA-220 firewalls for live session state sync."
  },
  {
    id: "rj45-mgt",
    label: "MGT Ethernet Cable",
    color: "#10b981",
    accepts: ["mgt"],
    desc: "Dedicated out-of-band management Ethernet cable connecting to admin subnet."
  },
  {
    id: "serial-con",
    label: "RJ-45 Serial Console",
    color: "#94a3b8",
    accepts: ["console"],
    desc: "Rollover cable — RJ-45 to USB/DB9 serial adapter on administrator laptop."
  },
  {
    id: "micro-usb",
    label: "Micro-USB Console",
    color: "#eab308",
    accepts: ["micro-usb"],
    desc: "Standard Micro-USB to USB-A cable for direct CLI console access without serial adapters."
  },
  {
    id: "usb-drive",
    label: "USB Flash Drive",
    color: "#06b6d4",
    accepts: ["usb"],
    desc: "USB flash drive with PAN-OS bootstrap configuration and installation images."
  },
  {
    id: "dc-12v",
    label: "12V DC Power Adapter",
    color: "#ef4444",
    accepts: ["power"],
    desc: "External 40W 12V DC power supply brick with locking barrel connector."
  }
];

export function acceptsPanCable(cableId: string, portId: string): boolean {
  const port = PAN_PORTS.find((p) => p.id === portId);
  const cable = PAN_CABLE_TYPES.find((c) => c.id === cableId);
  return !!port && !!cable && cable.accepts.includes(port.part);
}
