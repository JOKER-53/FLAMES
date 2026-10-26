import { Scenario } from "../../policy/types";

export const multiSystemScenario: Scenario = {
  id: "multi-system-block-01",
  title: "Block System 2",
  description:
    "Your LAN has four systems (System 1-4). Systems 1, 3, and 4 should be able to reach " +
    "the DMZ web server (10.0.2.10) on HTTP and HTTPS. System 2 (10.0.1.20) must be " +
    "completely blocked — it should not reach the web server on any service. " +
    "Configure your policies carefully: a rule placed earlier is evaluated first.",
  starterAddresses: [
    { id: "addr_sys1", name: "System-1", type: "subnet", value: "10.0.1.10/32" },
    { id: "addr_sys2", name: "System-2", type: "subnet", value: "10.0.1.20/32" },
    { id: "addr_sys3", name: "System-3", type: "subnet", value: "10.0.1.30/32" },
    { id: "addr_sys4", name: "System-4", type: "subnet", value: "10.0.1.40/32" },
    { id: "addr_webserver", name: "WebServer", type: "subnet", value: "10.0.2.10/32" },
    { id: "addr_lan", name: "LAN-all", type: "subnet", value: "10.0.1.0/24" },
  ],
  starterServices: [
    { id: "svc_http", name: "HTTP", protocol: "TCP", port: "80" },
    { id: "svc_https", name: "HTTPS", protocol: "TCP", port: "443" },
  ],
  testPackets: [
    { id: "pkt_sys1_allowed", description: "System 1 → WebServer HTTP (should be allowed)", srcIntf: "LAN", dstIntf: "DMZ", srcIp: "10.0.1.10", dstIp: "10.0.2.10", protocol: "TCP", port: 80 },
    { id: "pkt_sys2_http_blocked", description: "System 2 → WebServer HTTP (must be blocked)", srcIntf: "LAN", dstIntf: "DMZ", srcIp: "10.0.1.20", dstIp: "10.0.2.10", protocol: "TCP", port: 80 },
    { id: "pkt_sys2_https_blocked", description: "System 2 → WebServer HTTPS (must be blocked)", srcIntf: "LAN", dstIntf: "DMZ", srcIp: "10.0.1.20", dstIp: "10.0.2.10", protocol: "TCP", port: 443 },
    { id: "pkt_sys3_allowed", description: "System 3 → WebServer HTTPS (should be allowed)", srcIntf: "LAN", dstIntf: "DMZ", srcIp: "10.0.1.30", dstIp: "10.0.2.10", protocol: "TCP", port: 443 },
    { id: "pkt_sys4_allowed", description: "System 4 → WebServer HTTP (should be allowed)", srcIntf: "LAN", dstIntf: "DMZ", srcIp: "10.0.1.40", dstIp: "10.0.2.10", protocol: "TCP", port: 80 },
  ],
  expectedOutcomes: [
    { testPacketId: "pkt_sys1_allowed", expectedAction: "ACCEPT" },
    { testPacketId: "pkt_sys2_http_blocked", expectedAction: "DENY" },
    { testPacketId: "pkt_sys2_https_blocked", expectedAction: "DENY" },
    { testPacketId: "pkt_sys3_allowed", expectedAction: "ACCEPT" },
    { testPacketId: "pkt_sys4_allowed", expectedAction: "ACCEPT" },
  ],
};
