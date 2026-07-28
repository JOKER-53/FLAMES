// ============================================================================
// The three interface configuration scenarios.
// Separate from firewall policy scenarios -- different grading model,
// different UI, same AI feedback principle (diagnostics only, no answers).
// ============================================================================

import { InterfaceScenario, InterfaceConfig } from "./interfaceTypes";

const BLANK_INTERFACES: InterfaceConfig[] = [
  { name: "wan1", role: "WAN", ip: "", subnet: "", adminAccess: [], description: "Internet-facing interface" },
  { name: "dmz", role: "DMZ", ip: "", subnet: "", adminAccess: [], description: "Public server zone" },
  { name: "internal", role: "LAN", ip: "", subnet: "", adminAccess: [], description: "Internal trusted network" },
];

// ---- Scenario 1: Basic IP Assignment ----
export const interfaceIpScenario: InterfaceScenario = {
  id: "interface-ip-01",
  title: "Interface IP Assignment",
  description:
    "Assign the correct IP address and subnet mask to each interface. " +
    "WAN (wan1) connects to the internet and uses DHCP — leave its IP as 0.0.0.0. " +
    "DMZ (dmz) should be 10.0.2.1 with a /24 subnet. " +
    "LAN (internal) should be 10.0.1.1 with a /24 subnet.",
  starterInterfaces: BLANK_INTERFACES.map((i) => ({ ...i })),
  checks: [
    { interfaceName: "wan1", field: "ip", expectedValue: "0.0.0.0", description: "WAN interface IP (DHCP/internet)" },
    { interfaceName: "wan1", field: "subnet", expectedValue: "0", description: "WAN interface subnet" },
    { interfaceName: "dmz", field: "ip", expectedValue: "10.0.2.1", description: "DMZ interface IP" },
    { interfaceName: "dmz", field: "subnet", expectedValue: "24", description: "DMZ interface subnet (/24)" },
    { interfaceName: "internal", field: "ip", expectedValue: "10.0.1.1", description: "LAN interface IP" },
    { interfaceName: "internal", field: "subnet", expectedValue: "24", description: "LAN interface subnet (/24)" },
  ],
};

// ---- Scenario 2: Administrative Access ----
export const interfaceAccessScenario: InterfaceScenario = {
  id: "interface-access-01",
  title: "Administrative Access Control",
  description:
    "Configure which management protocols are allowed on each interface. " +
    "WAN (wan1): allow PING only — never expose SSH or HTTPS management to the internet. " +
    "DMZ (dmz): allow PING and HTTPS only. " +
    "LAN (internal): allow PING, HTTPS, and SSH — full management from the trusted network.",
  starterInterfaces: [
    { name: "wan1", role: "WAN", ip: "0.0.0.0", subnet: "0", adminAccess: [], description: "Internet-facing interface" },
    { name: "dmz", role: "DMZ", ip: "10.0.2.1", subnet: "24", adminAccess: [], description: "Public server zone" },
    { name: "internal", role: "LAN", ip: "10.0.1.1", subnet: "24", adminAccess: [], description: "Internal trusted network" },
  ],
  checks: [
    { interfaceName: "wan1", field: "adminAccess", expectedValue: ["PING"], description: "WAN admin access (PING only)" },
    { interfaceName: "dmz", field: "adminAccess", expectedValue: ["PING", "HTTPS"], description: "DMZ admin access (PING + HTTPS)" },
    { interfaceName: "internal", field: "adminAccess", expectedValue: ["PING", "HTTPS", "SSH"], description: "LAN admin access (PING + HTTPS + SSH)" },
  ],
};

// ---- Scenario 3: Custom Addressing Scheme ----
export const interfaceCustomScenario: InterfaceScenario = {
  id: "interface-custom-01",
  title: "Custom Addressing Scheme",
  description:
    "This branch uses a non-default address plan. WAN (wan1) still uses DHCP — leave its IP as 0.0.0.0. " +
    "DMZ (dmz) only needs to host a handful of servers, so it's been sized down to 172.16.10.1 with a /26 subnet " +
    "(not the usual /24). LAN (internal) should be 172.16.20.1 with a /24 subnet. " +
    "Configure administrative access the same way as before: WAN allows PING only, DMZ allows PING and HTTPS, " +
    "and LAN allows PING, HTTPS, and SSH.",
  starterInterfaces: BLANK_INTERFACES.map((i) => ({ ...i })),
  checks: [
    { interfaceName: "wan1", field: "ip", expectedValue: "0.0.0.0", description: "WAN interface IP (DHCP/internet)" },
    { interfaceName: "wan1", field: "subnet", expectedValue: "0", description: "WAN interface subnet" },
    { interfaceName: "wan1", field: "adminAccess", expectedValue: ["PING"], description: "WAN admin access (PING only)" },
    { interfaceName: "dmz", field: "ip", expectedValue: "172.16.10.1", description: "DMZ interface IP" },
    { interfaceName: "dmz", field: "subnet", expectedValue: "26", description: "DMZ interface subnet (/26, not /24)" },
    { interfaceName: "dmz", field: "adminAccess", expectedValue: ["PING", "HTTPS"], description: "DMZ admin access (PING + HTTPS)" },
    { interfaceName: "internal", field: "ip", expectedValue: "172.16.20.1", description: "LAN interface IP" },
    { interfaceName: "internal", field: "subnet", expectedValue: "24", description: "LAN interface subnet (/24)" },
    { interfaceName: "internal", field: "adminAccess", expectedValue: ["PING", "HTTPS", "SSH"], description: "LAN admin access (PING + HTTPS + SSH)" },
  ],
};

// ---- Scenario 4: Full Interface Configuration (Final Assessment — kept out
// of ALL_INTERFACE_SCENARIOS below so it isn't double-counted as a regular
// task; reached only via its own dedicated Final Assessment entry point) ----
export const interfaceFullScenario: InterfaceScenario = {
  id: "interface-full-01",
  title: "Full Interface Setup",
  description:
    "Configure all interfaces from scratch: assign correct IPs, subnets, and " +
    "administrative access for each zone. This is the complete interface configuration " +
    "a network administrator would perform before writing any firewall policies.",
  starterInterfaces: BLANK_INTERFACES.map((i) => ({ ...i })),
  checks: [
    { interfaceName: "wan1", field: "ip", expectedValue: "0.0.0.0", description: "WAN interface IP" },
    { interfaceName: "wan1", field: "subnet", expectedValue: "0", description: "WAN interface subnet" },
    { interfaceName: "wan1", field: "adminAccess", expectedValue: ["PING"], description: "WAN admin access" },
    { interfaceName: "dmz", field: "ip", expectedValue: "10.0.2.1", description: "DMZ interface IP" },
    { interfaceName: "dmz", field: "subnet", expectedValue: "24", description: "DMZ interface subnet" },
    { interfaceName: "dmz", field: "adminAccess", expectedValue: ["PING", "HTTPS"], description: "DMZ admin access" },
    { interfaceName: "internal", field: "ip", expectedValue: "10.0.1.1", description: "LAN interface IP" },
    { interfaceName: "internal", field: "subnet", expectedValue: "24", description: "LAN interface subnet" },
    { interfaceName: "internal", field: "adminAccess", expectedValue: ["PING", "HTTPS", "SSH"], description: "LAN admin access" },
  ],
};

export const ALL_INTERFACE_SCENARIOS: InterfaceScenario[] = [
  interfaceIpScenario,
  interfaceAccessScenario,
  interfaceCustomScenario,
];
