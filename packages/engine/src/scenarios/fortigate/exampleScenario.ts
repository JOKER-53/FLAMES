// ============================================================================
// Example Scenario: "Web Server Access"
// ============================================================================

import { Scenario } from "../../policy/types";

export const webServerAccessScenario: Scenario = {
  id: "web-server-access-01",
  title: "Web Server Access",
  description:
    "A web server in the DMZ (10.0.2.10) must be reachable via HTTPS from the " +
    "internet. No other traffic from the WAN should reach the DMZ. " +
    "Configure firewall policies to achieve this, with logging enabled on " +
    "the allow rule.",
  topologyNote: "WAN (internet) -- FortiGate -- DMZ (10.0.2.0/24, web server at 10.0.2.10)",

  starterAddresses: [
    { id: "addr_webserver", name: "WebServer", type: "subnet", value: "10.0.2.10/32" },
    { id: "addr_all", name: "all", type: "subnet", value: "0.0.0.0/0" },
  ],

  starterServices: [
    { id: "svc_https", name: "HTTPS", protocol: "TCP", port: "443" },
    { id: "svc_ssh", name: "SSH", protocol: "TCP", port: "22" },
    { id: "svc_http", name: "HTTP", protocol: "TCP", port: "80" },
  ],

  testPackets: [
    {
      id: "pkt_https_allowed",
      description: "HTTPS from internet to WebServer",
      srcIntf: "WAN",
      dstIntf: "DMZ",
      srcIp: "203.0.113.50",
      dstIp: "10.0.2.10",
      protocol: "TCP",
      port: 443,
    },
    {
      id: "pkt_ssh_blocked",
      description: "SSH from internet to WebServer (should be blocked)",
      srcIntf: "WAN",
      dstIntf: "DMZ",
      srcIp: "203.0.113.50",
      dstIp: "10.0.2.10",
      protocol: "TCP",
      port: 22,
    },
    {
      id: "pkt_http_blocked",
      description: "Plain HTTP from internet to WebServer (should be blocked, HTTPS only)",
      srcIntf: "WAN",
      dstIntf: "DMZ",
      srcIp: "203.0.113.50",
      dstIp: "10.0.2.10",
      protocol: "TCP",
      port: 80,
    },
    {
      id: "pkt_https_other_host_blocked",
      description: "HTTPS from internet to a different DMZ host (should be blocked, not WebServer)",
      srcIntf: "WAN",
      dstIntf: "DMZ",
      srcIp: "203.0.113.50",
      dstIp: "10.0.2.99",
      protocol: "TCP",
      port: 443,
    },
  ],

  expectedOutcomes: [
    { testPacketId: "pkt_https_allowed", expectedAction: "ACCEPT", expectedLog: true },
    { testPacketId: "pkt_ssh_blocked", expectedAction: "DENY" },
    { testPacketId: "pkt_http_blocked", expectedAction: "DENY" },
    { testPacketId: "pkt_https_other_host_blocked", expectedAction: "DENY" },
  ],
};
