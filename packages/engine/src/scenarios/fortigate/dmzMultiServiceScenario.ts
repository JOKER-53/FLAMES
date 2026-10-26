// ============================================================================
// Level 3: DMZ Multi-Service
// Teaches: multiple services on correct policies, not forgetting one,
// and the trap of using a single overly-broad service object instead of
// precisely the two required ones.
// ============================================================================

import { Scenario } from "../../policy/types";

export const dmzMultiServiceScenario: Scenario = {
  id: "dmz-multi-service-01",
  title: "DMZ Multi-Service",
  description:
    "A public server in the DMZ (10.0.2.20) must accept both HTTPS (443) and " +
    "DNS (UDP 53) traffic from the internet. All other traffic from WAN to DMZ " +
    "must be denied. Configure policies to allow exactly these two services and nothing else.",
  topologyNote: "WAN (internet) -- FortiGate -- DMZ (10.0.2.0/24, public server at 10.0.2.20)",

  starterAddresses: [
    { id: "addr_pubserver", name: "PubServer", type: "subnet", value: "10.0.2.20/32" },
    { id: "addr_all", name: "all", type: "subnet", value: "0.0.0.0/0" },
  ],

  starterServices: [
    { id: "svc_https", name: "HTTPS", protocol: "TCP", port: "443" },
    { id: "svc_dns_udp", name: "DNS-UDP", protocol: "UDP", port: "53" },
    { id: "svc_http", name: "HTTP", protocol: "TCP", port: "80" },
    { id: "svc_ssh", name: "SSH", protocol: "TCP", port: "22" },
  ],

  testPackets: [
    {
      id: "pkt_https_allowed",
      description: "HTTPS from internet to PubServer (should be allowed)",
      srcIntf: "WAN", dstIntf: "DMZ",
      srcIp: "203.0.113.10", dstIp: "10.0.2.20",
      protocol: "TCP", port: 443,
    },
    {
      id: "pkt_dns_allowed",
      description: "DNS (UDP/53) from internet to PubServer (should be allowed)",
      srcIntf: "WAN", dstIntf: "DMZ",
      srcIp: "203.0.113.10", dstIp: "10.0.2.20",
      protocol: "UDP", port: 53,
    },
    {
      id: "pkt_http_blocked",
      description: "HTTP from internet to PubServer (should be blocked, HTTPS only)",
      srcIntf: "WAN", dstIntf: "DMZ",
      srcIp: "203.0.113.10", dstIp: "10.0.2.20",
      protocol: "TCP", port: 80,
    },
    {
      id: "pkt_ssh_blocked",
      description: "SSH from internet to PubServer (should be blocked)",
      srcIntf: "WAN", dstIntf: "DMZ",
      srcIp: "203.0.113.10", dstIp: "10.0.2.20",
      protocol: "TCP", port: 22,
    },
    {
      id: "pkt_https_other_blocked",
      description: "HTTPS from internet to a different DMZ host (should be blocked)",
      srcIntf: "WAN", dstIntf: "DMZ",
      srcIp: "203.0.113.10", dstIp: "10.0.2.99",
      protocol: "TCP", port: 443,
    },
  ],

  expectedOutcomes: [
    { testPacketId: "pkt_https_allowed", expectedAction: "ACCEPT" },
    { testPacketId: "pkt_dns_allowed", expectedAction: "ACCEPT" },
    { testPacketId: "pkt_http_blocked", expectedAction: "DENY" },
    { testPacketId: "pkt_ssh_blocked", expectedAction: "DENY" },
    { testPacketId: "pkt_https_other_blocked", expectedAction: "DENY" },
  ],
};
