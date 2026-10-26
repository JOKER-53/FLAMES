// ============================================================================
// Level 4: Inter-Zone Trust
// Teaches: asymmetric zone rules -- LAN can reach DMZ but WAN cannot
// reach LAN directly. A common student mistake is writing rules that
// accidentally allow the reverse direction.
// ============================================================================

import { Scenario } from "../../policy/types";

export const interZoneTrustScenario: Scenario = {
  id: "inter-zone-trust-01",
  title: "Inter-Zone Trust",
  description:
    "Internal LAN users (10.0.1.0/24) must be able to reach the DMZ web server " +
    "(10.0.2.10) on HTTP and HTTPS. However, the WAN must NOT be able to reach " +
    "any LAN host directly. Configure policies that allow LAN-to-DMZ web access " +
    "while keeping WAN-to-LAN traffic completely blocked.",
  topologyNote: "WAN -- FortiGate -- LAN (10.0.1.0/24) and DMZ (10.0.2.0/24, web server at 10.0.2.10)",

  starterAddresses: [
    { id: "addr_lan", name: "LAN-Network", type: "subnet", value: "10.0.1.0/24" },
    { id: "addr_webserver", name: "WebServer", type: "subnet", value: "10.0.2.10/32" },
    { id: "addr_all", name: "all", type: "subnet", value: "0.0.0.0/0" },
  ],

  starterServices: [
    { id: "svc_http", name: "HTTP", protocol: "TCP", port: "80" },
    { id: "svc_https", name: "HTTPS", protocol: "TCP", port: "443" },
    { id: "svc_ssh", name: "SSH", protocol: "TCP", port: "22" },
  ],

  testPackets: [
    {
      id: "pkt_lan_http_allowed",
      description: "LAN user -> DMZ WebServer on HTTP (should be allowed)",
      srcIntf: "LAN", dstIntf: "DMZ",
      srcIp: "10.0.1.50", dstIp: "10.0.2.10",
      protocol: "TCP", port: 80,
    },
    {
      id: "pkt_lan_https_allowed",
      description: "LAN user -> DMZ WebServer on HTTPS (should be allowed)",
      srcIntf: "LAN", dstIntf: "DMZ",
      srcIp: "10.0.1.50", dstIp: "10.0.2.10",
      protocol: "TCP", port: 443,
    },
    {
      id: "pkt_wan_to_lan_blocked",
      description: "WAN -> LAN host (should be blocked, WAN cannot reach LAN)",
      srcIntf: "WAN", dstIntf: "LAN",
      srcIp: "203.0.113.10", dstIp: "10.0.1.50",
      protocol: "TCP", port: 80,
    },
    {
      id: "pkt_wan_ssh_to_lan_blocked",
      description: "WAN -> LAN host on SSH (should be blocked)",
      srcIntf: "WAN", dstIntf: "LAN",
      srcIp: "203.0.113.10", dstIp: "10.0.1.10",
      protocol: "TCP", port: 22,
    },
    {
      id: "pkt_lan_ssh_to_dmz_blocked",
      description: "LAN user -> DMZ WebServer on SSH (should be blocked, HTTP/HTTPS only)",
      srcIntf: "LAN", dstIntf: "DMZ",
      srcIp: "10.0.1.50", dstIp: "10.0.2.10",
      protocol: "TCP", port: 22,
    },
  ],

  expectedOutcomes: [
    { testPacketId: "pkt_lan_http_allowed", expectedAction: "ACCEPT" },
    { testPacketId: "pkt_lan_https_allowed", expectedAction: "ACCEPT" },
    { testPacketId: "pkt_wan_to_lan_blocked", expectedAction: "DENY" },
    { testPacketId: "pkt_wan_ssh_to_lan_blocked", expectedAction: "DENY" },
    { testPacketId: "pkt_lan_ssh_to_dmz_blocked", expectedAction: "DENY" },
  ],
};
