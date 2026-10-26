import { Scenario } from "../../policy/types";
import { PortScenario } from "../../ports/portTypes";

export const firewallFinalScenario: Scenario = {
  id: "firewall-final-01",
  title: "🏆 Firewall Policy Final",
  description:
    "The ultimate firewall challenge combining everything: multiple systems, DMZ servers, " +
    "web filtering, and inter-zone security. Rules: " +
    "(1) WAN can reach DMZ Web Server (10.0.2.10) on HTTPS only. " +
    "(2) Corporate LAN (10.0.1.0/25) can reach DMZ Web Server on HTTP and HTTPS. " +
    "(3) Guest subnet (10.0.1.128/25) can access the internet but NOT the DMZ or Corporate LAN. " +
    "(4) System 2 (10.0.1.20) must be completely blocked from everything. " +
    "(5) Create a Web Filter profile blocking instagram.com and attach it to the LAN-to-WAN policy. " +
    "(6) DMZ must never initiate connections to LAN.",
  starterAddresses: [
    { id: "addr_webserver", name: "Web-Server", type: "subnet", value: "10.0.2.10/32" },
    { id: "addr_corp", name: "Corporate-LAN", type: "subnet", value: "10.0.1.0/25" },
    { id: "addr_guest", name: "Guest-Subnet", type: "subnet", value: "10.0.1.128/25" },
    { id: "addr_sys2", name: "System-2", type: "subnet", value: "10.0.1.20/32" },
    { id: "addr_dmz", name: "DMZ-Network", type: "subnet", value: "10.0.2.0/24" },
    { id: "addr_all", name: "all", type: "subnet", value: "0.0.0.0/0" },
  ],
  starterServices: [
    { id: "svc_https", name: "HTTPS", protocol: "TCP", port: "443" },
    { id: "svc_http", name: "HTTP", protocol: "TCP", port: "80" },
    { id: "svc_ssh", name: "SSH", protocol: "TCP", port: "22" },
  ],
  starterWebFilterProfiles: [],
  testPackets: [
    { id: "pkt_wan_web_https", description: "WAN → Web Server HTTPS (allowed)", srcIntf: "WAN", dstIntf: "DMZ", srcIp: "1.1.1.1", dstIp: "10.0.2.10", protocol: "TCP", port: 443 },
    { id: "pkt_wan_web_http", description: "WAN → Web Server HTTP (blocked)", srcIntf: "WAN", dstIntf: "DMZ", srcIp: "1.1.1.1", dstIp: "10.0.2.10", protocol: "TCP", port: 80 },
    { id: "pkt_corp_web_https", description: "Corporate → Web Server HTTPS (allowed)", srcIntf: "LAN", dstIntf: "DMZ", srcIp: "10.0.1.10", dstIp: "10.0.2.10", protocol: "TCP", port: 443 },
    { id: "pkt_corp_web_http", description: "Corporate → Web Server HTTP (allowed)", srcIntf: "LAN", dstIntf: "DMZ", srcIp: "10.0.1.10", dstIp: "10.0.2.10", protocol: "TCP", port: 80 },
    { id: "pkt_sys2_blocked", description: "System 2 → anywhere (blocked)", srcIntf: "LAN", dstIntf: "DMZ", srcIp: "10.0.1.20", dstIp: "10.0.2.10", protocol: "TCP", port: 443 },
    { id: "pkt_guest_wan", description: "Guest → Internet (allowed)", srcIntf: "LAN", dstIntf: "WAN", srcIp: "10.0.1.200", dstIp: "8.8.8.8", protocol: "TCP", port: 443 },
    { id: "pkt_guest_dmz", description: "Guest → DMZ (blocked)", srcIntf: "LAN", dstIntf: "DMZ", srcIp: "10.0.1.200", dstIp: "10.0.2.10", protocol: "TCP", port: 443 },
    { id: "pkt_instagram", description: "Corporate → instagram.com (blocked by Web Filter)", srcIntf: "LAN", dstIntf: "WAN", srcIp: "10.0.1.10", dstIp: "31.13.70.36", protocol: "TCP", port: 443, domain: "instagram.com" },
    { id: "pkt_github", description: "Corporate → github.com (allowed)", srcIntf: "LAN", dstIntf: "WAN", srcIp: "10.0.1.10", dstIp: "140.82.112.4", protocol: "TCP", port: 443, domain: "github.com" },
    { id: "pkt_dmz_to_lan", description: "DMZ → LAN (blocked)", srcIntf: "DMZ", dstIntf: "LAN", srcIp: "10.0.2.10", dstIp: "10.0.1.10", protocol: "TCP", port: 80 },
  ],
  expectedOutcomes: [
    { testPacketId: "pkt_wan_web_https", expectedAction: "ACCEPT" },
    { testPacketId: "pkt_wan_web_http", expectedAction: "DENY" },
    { testPacketId: "pkt_corp_web_https", expectedAction: "ACCEPT" },
    { testPacketId: "pkt_corp_web_http", expectedAction: "ACCEPT" },
    { testPacketId: "pkt_sys2_blocked", expectedAction: "DENY" },
    { testPacketId: "pkt_guest_wan", expectedAction: "ACCEPT" },
    { testPacketId: "pkt_guest_dmz", expectedAction: "DENY" },
    { testPacketId: "pkt_instagram", expectedAction: "DENY" },
    { testPacketId: "pkt_github", expectedAction: "ACCEPT" },
    { testPacketId: "pkt_dmz_to_lan", expectedAction: "DENY" },
  ],
};

export const portFinalScenario: PortScenario = {
  id: "port-final-01",
  title: "🏆 Port Assignment Final",
  description:
    "The complete port challenge combining all concepts: redundant WAN, multi-server DMZ, " +
    "large LAN, a spare wired-but-unused port, and a trick port physically near WAN but " +
    "wired to LAN. Ports 1-5: LAN. Ports 6-7: DMZ. WAN1+WAN2: WAN. " +
    "Port 8: Unassigned (spare). Port 9: LAN (trick — wired to internal switch).",
  ports: [
    { portId: "port1", label: "1" }, { portId: "port2", label: "2" },
    { portId: "port3", label: "3" }, { portId: "port4", label: "4" },
    { portId: "port5", label: "5" }, { portId: "port6", label: "6" },
    { portId: "port7", label: "7" }, { portId: "wan1", label: "W1" },
    { portId: "wan2", label: "W2" }, { portId: "port8", label: "8" },
    { portId: "port9", label: "9" },
  ],
  checks: [
    { portId: "port1", expectedZone: "LAN", description: "Port 1 → LAN" },
    { portId: "port2", expectedZone: "LAN", description: "Port 2 → LAN" },
    { portId: "port3", expectedZone: "LAN", description: "Port 3 → LAN" },
    { portId: "port4", expectedZone: "LAN", description: "Port 4 → LAN" },
    { portId: "port5", expectedZone: "LAN", description: "Port 5 → LAN" },
    { portId: "port6", expectedZone: "DMZ", description: "Port 6 → DMZ (server 1)" },
    { portId: "port7", expectedZone: "DMZ", description: "Port 7 → DMZ (server 2)" },
    { portId: "wan1", expectedZone: "WAN", description: "WAN1 → WAN (primary)" },
    { portId: "wan2", expectedZone: "WAN", description: "WAN2 → WAN (backup)" },
    { portId: "port8", expectedZone: "unassigned", description: "Port 8 → Unassigned (spare)" },
    { portId: "port9", expectedZone: "LAN", description: "Port 9 → LAN (trick port)" },
  ],
};
