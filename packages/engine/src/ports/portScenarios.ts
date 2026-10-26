import { PortScenario } from "./portTypes";

export const portAssignmentScenario: PortScenario = {
  id: "port-assignment-01",
  title: "Basic Port Assignment",
  description:
    "Assign each physical port to the correct zone. " +
    "Ports 1-4 are internal LAN ports (connected to the internal switch). " +
    "Port 5 should be assigned to DMZ for your public-facing servers. " +
    "WAN1 and WAN2 are the internet-facing ports — assign them to WAN. " +
    "Leave unused ports as unassigned.",
  ports: [
    { portId: "port1", label: "1" },
    { portId: "port2", label: "2" },
    { portId: "port3", label: "3" },
    { portId: "port4", label: "4" },
    { portId: "port5", label: "5" },
    { portId: "wan1", label: "W1" },
    { portId: "wan2", label: "W2" },
    { portId: "port6", label: "6" },
  ],
  checks: [
    { portId: "port1", expectedZone: "LAN", description: "Port 1 → LAN (internal switch)" },
    { portId: "port2", expectedZone: "LAN", description: "Port 2 → LAN (internal switch)" },
    { portId: "port3", expectedZone: "LAN", description: "Port 3 → LAN (internal switch)" },
    { portId: "port4", expectedZone: "LAN", description: "Port 4 → LAN (internal switch)" },
    { portId: "port5", expectedZone: "DMZ", description: "Port 5 → DMZ (public server zone)" },
    { portId: "wan1", expectedZone: "WAN", description: "WAN1 → WAN (internet uplink)" },
    { portId: "wan2", expectedZone: "WAN", description: "WAN2 → WAN (backup internet uplink)" },
    { portId: "port6", expectedZone: "unassigned", description: "Port 6 → Unassigned (unused)" },
  ],
};

export const portMultiDmzScenario: PortScenario = {
  id: "port-multi-dmz-01",
  title: "Multi-Server DMZ",
  description:
    "This network hosts two public-facing servers, so it needs two DMZ ports. " +
    "Ports 1-2 are internal LAN. Ports 3-4 must BOTH be DMZ (one for a web server, " +
    "one for a mail server). WAN1 is the single internet uplink. " +
    "Ports 5 and 6 are not in use yet — leave them unassigned. " +
    "Don't default every server-facing port to LAN out of habit — check what each one actually connects to.",
  ports: [
    { portId: "port1", label: "1" },
    { portId: "port2", label: "2" },
    { portId: "port3", label: "3" },
    { portId: "port4", label: "4" },
    { portId: "port5", label: "5" },
    { portId: "port6", label: "6" },
    { portId: "wan1", label: "W1" },
  ],
  checks: [
    { portId: "port1", expectedZone: "LAN", description: "Port 1 → LAN" },
    { portId: "port2", expectedZone: "LAN", description: "Port 2 → LAN" },
    { portId: "port3", expectedZone: "DMZ", description: "Port 3 → DMZ (web server)" },
    { portId: "port4", expectedZone: "DMZ", description: "Port 4 → DMZ (mail server)" },
    { portId: "port5", expectedZone: "unassigned", description: "Port 5 → Unassigned (not in use)" },
    { portId: "port6", expectedZone: "unassigned", description: "Port 6 → Unassigned (not in use)" },
    { portId: "wan1", expectedZone: "WAN", description: "WAN1 → WAN" },
  ],
};

export const portRedundantWanScenario: PortScenario = {
  id: "port-redundant-wan-01",
  title: "Redundant WAN Uplinks",
  description:
    "This site has two internet service providers for redundancy: WAN1 (primary) " +
    "and WAN2 (backup). BOTH must be assigned to the WAN zone — a backup link is " +
    "still WAN, not unassigned. Ports 1-3 are LAN. Port 4 is a spare port that is " +
    "physically wired but not yet in service — it should stay unassigned, even " +
    "though it's connected. Being wired doesn't mean a port should be configured.",
  ports: [
    { portId: "port1", label: "1" },
    { portId: "port2", label: "2" },
    { portId: "port3", label: "3" },
    { portId: "port4", label: "4" },
    { portId: "wan1", label: "W1" },
    { portId: "wan2", label: "W2" },
  ],
  checks: [
    { portId: "port1", expectedZone: "LAN", description: "Port 1 → LAN" },
    { portId: "port2", expectedZone: "LAN", description: "Port 2 → LAN" },
    { portId: "port3", expectedZone: "LAN", description: "Port 3 → LAN" },
    { portId: "port4", expectedZone: "unassigned", description: "Port 4 → Unassigned (spare, not in service)" },
    { portId: "wan1", expectedZone: "WAN", description: "WAN1 → WAN (primary uplink)" },
    { portId: "wan2", expectedZone: "WAN", description: "WAN2 → WAN (backup uplink)" },
  ],
};

export const portLargeOfficeScenario: PortScenario = {
  id: "port-large-office-01",
  title: "Larger Office Network",
  description:
    "A larger office needs more internal ports. Ports 1-6 are all internal LAN " +
    "ports for staff workstations. Ports 7-8 serve a small DMZ for the office's " +
    "public website and VPN gateway. WAN1 is the single internet connection. " +
    "Ports 9-10 are reserved for future expansion — leave them unassigned.",
  ports: [
    { portId: "port1", label: "1" },
    { portId: "port2", label: "2" },
    { portId: "port3", label: "3" },
    { portId: "port4", label: "4" },
    { portId: "port5", label: "5" },
    { portId: "port6", label: "6" },
    { portId: "port7", label: "7" },
    { portId: "port8", label: "8" },
    { portId: "port9", label: "9" },
    { portId: "port10", label: "10" },
    { portId: "wan1", label: "W1" },
  ],
  checks: [
    { portId: "port1", expectedZone: "LAN", description: "Port 1 → LAN" },
    { portId: "port2", expectedZone: "LAN", description: "Port 2 → LAN" },
    { portId: "port3", expectedZone: "LAN", description: "Port 3 → LAN" },
    { portId: "port4", expectedZone: "LAN", description: "Port 4 → LAN" },
    { portId: "port5", expectedZone: "LAN", description: "Port 5 → LAN" },
    { portId: "port6", expectedZone: "LAN", description: "Port 6 → LAN" },
    { portId: "port7", expectedZone: "DMZ", description: "Port 7 → DMZ (public website)" },
    { portId: "port8", expectedZone: "DMZ", description: "Port 8 → DMZ (VPN gateway)" },
    { portId: "port9", expectedZone: "unassigned", description: "Port 9 → Unassigned (reserved)" },
    { portId: "port10", expectedZone: "unassigned", description: "Port 10 → Unassigned (reserved)" },
    { portId: "wan1", expectedZone: "WAN", description: "WAN1 → WAN" },
  ],
};

export const portPositionTrapScenario: PortScenario = {
  id: "port-position-trap-01",
  title: "Don't Assume by Position",
  description:
    "Port numbering doesn't always match physical grouping on every device. " +
    "On this chassis, port7 sits physically next to the WAN ports on the panel, " +
    "but it is wired to the internal switch and must be assigned to LAN. " +
    "Ports 1-3 are LAN as usual. Port 5 is DMZ. WAN1 and WAN2 are WAN. " +
    "Always check what a port is actually wired to, not just where it sits on the panel.",
  ports: [
    { portId: "port1", label: "1" },
    { portId: "port2", label: "2" },
    { portId: "port3", label: "3" },
    { portId: "port5", label: "5" },
    { portId: "wan1", label: "W1" },
    { portId: "wan2", label: "W2" },
    { portId: "port7", label: "7" },
  ],
  checks: [
    { portId: "port1", expectedZone: "LAN", description: "Port 1 → LAN" },
    { portId: "port2", expectedZone: "LAN", description: "Port 2 → LAN" },
    { portId: "port3", expectedZone: "LAN", description: "Port 3 → LAN" },
    { portId: "port5", expectedZone: "DMZ", description: "Port 5 → DMZ" },
    { portId: "wan1", expectedZone: "WAN", description: "WAN1 → WAN" },
    { portId: "wan2", expectedZone: "WAN", description: "WAN2 → WAN" },
    { portId: "port7", expectedZone: "LAN", description: "Port 7 → LAN (wired to internal switch, despite its position on the panel)" },
  ],
};

import { portFinalScenario } from "../scenarios/assessments/finalAssignments";
export { portFinalScenario };

export const ALL_PORT_SCENARIOS: PortScenario[] = [
  portAssignmentScenario,
  portMultiDmzScenario,
  portRedundantWanScenario,
  portLargeOfficeScenario,
  portPositionTrapScenario,
  portFinalScenario,
];
