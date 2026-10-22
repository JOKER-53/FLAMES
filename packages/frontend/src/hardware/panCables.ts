/**
 * Palo Alto PA-220 port positions.
 *
 * x / y  are NORMALIZED fractions of the model's bounding-box size.
 *   world_x = port.x * sz.x   (sz.x ≈ 8 after auto-scale)
 *   world_y = port.y * sz.y
 *
 * PA-220 front-panel layout reference:
 *   Left vent  ~30 % of width  → x_world ≈ -4 to -1.6  → x_norm < -0.20
 *   Data ports ~40 % of width  → x_world ≈ -1.6 to  0.5 → x_norm -0.20..+0.06
 *   MGT/Console                → x_world ≈  0.5 to  2.0 → x_norm +0.06..+0.25
 *   Right area (LEDs + vent)   → x_world ≈  2.0 to  4   → x_norm > +0.25
 */

export interface PanPort {
  id:    string;
  name:  string;
  part:  string;
  x:     number;   // normalised to model width  (-0.5 … +0.5)
  y:     number;   // normalised to model height (-0.5 … +0.5)
  color: string;
  desc:  string;
}

export interface PanCableType {
  id:      string;
  label:   string;
  color:   string;
  accepts: string[];
  desc:    string;
}

export const PAN_PORTS: PanPort[] = [
  // ── 8 data ports in 4 dual-port columns ──────────────────────────────────
  // pair 1  (left-most data column)
  { id: "eth1_1", name: "Ethernet 1/1 (WAN/Untrust)", part: "data-wan",
    x: -0.165, y:  0.09, color: "#f97316",
    desc: "10/100/1000 RJ-45 typically configured as Untrust (Internet uplink) with NAT and security policy." },
  { id: "eth1_2", name: "Ethernet 1/2 (LAN/Trust)", part: "data-lan",
    x: -0.165, y: -0.09, color: "#2563eb",
    desc: "10/100/1000 RJ-45 typically configured as Trust (internal LAN)." },

  // pair 2
  { id: "eth1_3", name: "Ethernet 1/3 (DMZ)", part: "data-dmz",
    x: -0.095, y:  0.09, color: "#0d9488",
    desc: "10/100/1000 RJ-45 for a demilitarized zone (public-facing servers)." },
  { id: "eth1_4", name: "Ethernet 1/4 (HA1 Control)", part: "data-ha1",
    x: -0.095, y: -0.09, color: "#8b5cf6",
    desc: "Configured as HA1 Control link — carries heartbeat and config-sync traffic." },

  // pair 3
  { id: "eth1_5", name: "Ethernet 1/5 (HA2 Session)", part: "data-ha2",
    x: -0.025, y:  0.09, color: "#a855f7",
    desc: "Configured as HA2 Data link — carries session-state synchronization." },
  { id: "eth1_6", name: "Ethernet 1/6", part: "data-lan",
    x: -0.025, y: -0.09, color: "#3b82f6",
    desc: "10/100/1000 RJ-45 general-purpose data-plane interface." },

  // pair 4
  { id: "eth1_7", name: "Ethernet 1/7", part: "data-lan",
    x:  0.045, y:  0.09, color: "#60a5fa",
    desc: "10/100/1000 RJ-45 general-purpose data-plane interface." },
  { id: "eth1_8", name: "Ethernet 1/8", part: "data-lan",
    x:  0.045, y: -0.09, color: "#60a5fa",
    desc: "10/100/1000 RJ-45 general-purpose data-plane interface." },

  // ── Management & Console ──────────────────────────────────────────────────
  { id: "mgt", name: "MGT (Out-of-Band Management)", part: "mgt",
    x:  0.120, y:  0.09, color: "#10b981",
    desc: "Dedicated 10/100/1000 OOB management port (default 192.168.1.1) — isolated from data plane." },
  { id: "console", name: "Console (RJ-45 Serial)", part: "console",
    x:  0.120, y: -0.07, color: "#94a3b8",
    desc: "RJ-45 serial console (9600 baud, 8-N-1) for direct CLI access." },
  { id: "micro_usb", name: "Micro-USB Console", part: "micro-usb",
    x:  0.190, y: -0.04, color: "#eab308",
    desc: "Micro-USB console port — connect directly with a USB cable, no serial adapter needed." },
  { id: "usb", name: "USB 3.0", part: "usb",
    x:  0.248, y: -0.04, color: "#06b6d4",
    desc: "USB 3.0 port for bootstrap configuration, PAN-OS recovery images, and logs." },

  // ── Power inputs ─────────────────────────────────────────────────────────
  { id: "pwr1", name: "PWR 1 (Primary 12 V DC)", part: "power",
    x:  0.350, y:  0.00, color: "#ef4444",
    desc: "Primary 12 V DC barrel power input. PA-220 supports two external power bricks for redundancy." },
  { id: "pwr2", name: "PWR 2 (Redundant 12 V DC)", part: "power",
    x:  0.410, y:  0.00, color: "#dc2626",
    desc: "Secondary redundant 12 V DC power input for seamless power failover." },
];

export const PAN_CABLE_TYPES: PanCableType[] = [
  { id: "rj45-wan",    label: "RJ-45 WAN (Untrust)", color: "#f97316",
    accepts: ["data-wan", "data-lan"],
    desc: "Ethernet patch cable to ISP gateway / CPE uplink router." },
  { id: "rj45-lan",    label: "RJ-45 LAN (Trust)", color: "#2563eb",
    accepts: ["data-lan", "data-wan"],
    desc: "Cat-6 patch cable to internal core/access switches." },
  { id: "rj45-dmz",    label: "RJ-45 DMZ", color: "#0d9488",
    accepts: ["data-dmz", "data-lan"],
    desc: "Ethernet link to the demilitarized server-zone switch." },
  { id: "rj45-ha1",    label: "HA1 Control Cable", color: "#8b5cf6",
    accepts: ["data-ha1", "data-lan"],
    desc: "Direct peer-to-peer cable for HA1 heartbeat and config-sync." },
  { id: "rj45-ha2",    label: "HA2 Data Sync Cable", color: "#a855f7",
    accepts: ["data-ha2", "data-lan"],
    desc: "Direct peer-to-peer cable for HA2 live session-state sync." },
  { id: "rj45-mgt",    label: "MGT Ethernet Cable", color: "#10b981",
    accepts: ["mgt"],
    desc: "OOB management cable to admin/jump-host subnet." },
  { id: "serial-con",  label: "RJ-45 Serial Console", color: "#94a3b8",
    accepts: ["console"],
    desc: "Rollover cable — RJ-45 to USB/DB9 adapter on admin laptop." },
  { id: "micro-usb",   label: "Micro-USB Console", color: "#eab308",
    accepts: ["micro-usb"],
    desc: "Standard Micro-USB-A cable to laptop USB port for console." },
  { id: "usb-drive",   label: "USB Flash Drive", color: "#06b6d4",
    accepts: ["usb"],
    desc: "USB drive with PAN-OS bootstrap image or config bundle." },
  { id: "dc-12v",      label: "12 V DC Power Adapter", color: "#ef4444",
    accepts: ["power"],
    desc: "External 40 W 12 V DC supply with locking barrel connector." },
];

export function acceptsPanCable(cableId: string, portId: string): boolean {
  const port  = PAN_PORTS.find(p => p.id === portId);
  const cable = PAN_CABLE_TYPES.find(c => c.id === cableId);
  return !!port && !!cable && cable.accepts.includes(port.part);
}
