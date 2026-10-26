// ============================================================================
// Level 5: Full Network Policy
// Teaches: composing multiple policies for a realistic small network.
// Three zones, three traffic flows to configure correctly. The key concept:
// DMZ must never be able to initiate connections into LAN (security boundary),
// even though LAN can reach DMZ and WAN can reach DMZ web server.
// ============================================================================

import { Scenario } from "../../policy/types";

export const fullNetworkPolicyScenario: Scenario = {
  id: "full-network-policy-01",
  title: "Full Network Policy",
  description:
    "Configure a complete small-network firewall policy set: " +
    "(1) WAN can reach DMZ web server (10.0.2.10) on HTTPS only. " +
    "(2) LAN (10.0.1.0/24) can reach the DMZ web server on HTTP and HTTPS. " +
    "(3) DMZ must NOT be able to initiate any connection into LAN — " +
    "the DMZ is a semi-trusted zone, not an internal one. " +
    "All other traffic not explicitly allowed must be denied.",
  topologyNote: "WAN -- FortiGate -- LAN (10.0.1.0/24) and DMZ (10.0.2.0/24, web server at 10.0.2.10)",

  starterAddresses: [
    { id: "addr_webserver", name: "WebServer", type: "subnet", value: "10.0.2.10/32" },
    { id: "addr_lan", name: "LAN-Network", type: "subnet", value: "10.0.1.0/24" },
    { id: "addr_dmz", name: "DMZ-Network", type: "subnet", value: "10.0.2.0/24" },
    { id: "addr_all", name: "all", type: "subnet", value: "0.0.0.0/0" },
  ],

  starterServices: [
    { id: "svc_https", name: "HTTPS", protocol: "TCP", port: "443" },
    { id: "svc_http", name: "HTTP", protocol: "TCP", port: "80" },
    { id: "svc_ssh", name: "SSH", protocol: "TCP", port: "22" },
  ],

  testPackets: [
    {
      id: "pkt_wan_https_allowed",
      description: "WAN -> DMZ WebServer HTTPS (should be allowed)",
      srcIntf: "WAN", dstIntf: "DMZ",
      srcIp: "203.0.113.10", dstIp: "10.0.2.10",
      protocol: "TCP", port: 443,
    },
    {
      id: "pkt_wan_http_blocked",
      description: "WAN -> DMZ WebServer HTTP (should be blocked, HTTPS only from WAN)",
      srcIntf: "WAN", dstIntf: "DMZ",
      srcIp: "203.0.113.10", dstIp: "10.0.2.10",
      protocol: "TCP", port: 80,
    },
    {
      id: "pkt_lan_http_allowed",
      description: "LAN -> DMZ WebServer HTTP (should be allowed)",
      srcIntf: "LAN", dstIntf: "DMZ",
      srcIp: "10.0.1.50", dstIp: "10.0.2.10",
      protocol: "TCP", port: 80,
    },
    {
      id: "pkt_lan_https_allowed",
      description: "LAN -> DMZ WebServer HTTPS (should be allowed)",
      srcIntf: "LAN", dstIntf: "DMZ",
      srcIp: "10.0.1.50", dstIp: "10.0.2.10",
      protocol: "TCP", port: 443,
    },
    {
      id: "pkt_dmz_to_lan_blocked",
      description: "DMZ -> LAN host (should be blocked, DMZ cannot initiate into LAN)",
      srcIntf: "DMZ", dstIntf: "LAN",
      srcIp: "10.0.2.10", dstIp: "10.0.1.50",
      protocol: "TCP", port: 80,
    },
    {
      id: "pkt_dmz_ssh_to_lan_blocked",
      description: "DMZ -> LAN host on SSH (should be blocked)",
      srcIntf: "DMZ", dstIntf: "LAN",
      srcIp: "10.0.2.10", dstIp: "10.0.1.10",
      protocol: "TCP", port: 22,
    },
    {
      id: "pkt_wan_to_lan_blocked",
      description: "WAN -> LAN host directly (should be blocked)",
      srcIntf: "WAN", dstIntf: "LAN",
      srcIp: "203.0.113.10", dstIp: "10.0.1.50",
      protocol: "TCP", port: 443,
    },
  ],

  expectedOutcomes: [
    { testPacketId: "pkt_wan_https_allowed", expectedAction: "ACCEPT" },
    { testPacketId: "pkt_wan_http_blocked", expectedAction: "DENY" },
    { testPacketId: "pkt_lan_http_allowed", expectedAction: "ACCEPT" },
    { testPacketId: "pkt_lan_https_allowed", expectedAction: "ACCEPT" },
    { testPacketId: "pkt_dmz_to_lan_blocked", expectedAction: "DENY" },
    { testPacketId: "pkt_dmz_ssh_to_lan_blocked", expectedAction: "DENY" },
    { testPacketId: "pkt_wan_to_lan_blocked", expectedAction: "DENY" },
  ],
};
