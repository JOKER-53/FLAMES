import { Scenario } from "../../policy/types";

export const serverSegmentationScenario: Scenario = {
  id: "server-segmentation-01",
  title: "Server Segmentation",
  description:
    "Your LAN has two subnets: Workstations (10.0.1.0/25) and Servers (10.0.1.128/25). " +
    "Workstations must reach the Servers subnet on HTTP only. Servers must NOT initiate " +
    "connections to Workstations. Both subnets can reach the internet on HTTP and HTTPS. " +
    "WAN must not reach either internal subnet directly.",
  starterAddresses: [
    { id: "addr_workstations", name: "Workstations", type: "subnet", value: "10.0.1.0/25" },
    { id: "addr_servers", name: "Servers", type: "subnet", value: "10.0.1.128/25" },
    { id: "addr_all", name: "all", type: "subnet", value: "0.0.0.0/0" },
  ],
  starterServices: [
    { id: "svc_http", name: "HTTP", protocol: "TCP", port: "80" },
    { id: "svc_https", name: "HTTPS", protocol: "TCP", port: "443" },
  ],
  testPackets: [
    { id: "pkt_ws_to_srv_http", description: "Workstation → Server HTTP (allowed)", srcIntf: "LAN", dstIntf: "LAN", srcIp: "10.0.1.10", dstIp: "10.0.1.130", protocol: "TCP", port: 80 },
    { id: "pkt_ws_to_srv_https", description: "Workstation → Server HTTPS (blocked, HTTP only)", srcIntf: "LAN", dstIntf: "LAN", srcIp: "10.0.1.10", dstIp: "10.0.1.130", protocol: "TCP", port: 443 },
    { id: "pkt_srv_to_ws", description: "Server → Workstation (blocked, servers can't initiate)", srcIntf: "LAN", dstIntf: "LAN", srcIp: "10.0.1.130", dstIp: "10.0.1.10", protocol: "TCP", port: 80 },
    { id: "pkt_ws_to_wan", description: "Workstation → Internet HTTPS (allowed)", srcIntf: "LAN", dstIntf: "WAN", srcIp: "10.0.1.10", dstIp: "1.1.1.1", protocol: "TCP", port: 443 },
    { id: "pkt_wan_to_ws", description: "WAN → Workstation (blocked)", srcIntf: "WAN", dstIntf: "LAN", srcIp: "1.1.1.1", dstIp: "10.0.1.10", protocol: "TCP", port: 80 },
  ],
  expectedOutcomes: [
    { testPacketId: "pkt_ws_to_srv_http", expectedAction: "ACCEPT" },
    { testPacketId: "pkt_ws_to_srv_https", expectedAction: "DENY" },
    { testPacketId: "pkt_srv_to_ws", expectedAction: "DENY" },
    { testPacketId: "pkt_ws_to_wan", expectedAction: "ACCEPT" },
    { testPacketId: "pkt_wan_to_ws", expectedAction: "DENY" },
  ],
};

export const guestIsolationScenario: Scenario = {
  id: "guest-isolation-01",
  title: "Guest Network Isolation",
  description:
    "A guest WiFi subnet (10.0.1.200/29) shares the LAN zone with the corporate " +
    "subnet (10.0.1.0/24). Guests must have internet access (HTTP/HTTPS) but must be " +
    "completely isolated from the corporate subnet in both directions. " +
    "Corporate users can reach the internet freely. WAN cannot reach either subnet.",
  starterAddresses: [
    { id: "addr_corporate", name: "Corporate-LAN", type: "subnet", value: "10.0.1.0/24" },
    { id: "addr_guest", name: "Guest-WiFi", type: "subnet", value: "10.0.1.200/29" },
    { id: "addr_all", name: "all", type: "subnet", value: "0.0.0.0/0" },
  ],
  starterServices: [
    { id: "svc_http", name: "HTTP", protocol: "TCP", port: "80" },
    { id: "svc_https", name: "HTTPS", protocol: "TCP", port: "443" },
  ],
  testPackets: [
    { id: "pkt_guest_to_wan", description: "Guest → Internet HTTPS (allowed)", srcIntf: "LAN", dstIntf: "WAN", srcIp: "10.0.1.201", dstIp: "1.1.1.1", protocol: "TCP", port: 443 },
    { id: "pkt_guest_to_corp", description: "Guest → Corporate LAN (blocked)", srcIntf: "LAN", dstIntf: "LAN", srcIp: "10.0.1.201", dstIp: "10.0.1.50", protocol: "TCP", port: 443 },
    { id: "pkt_corp_to_guest", description: "Corporate → Guest WiFi (blocked)", srcIntf: "LAN", dstIntf: "LAN", srcIp: "10.0.1.50", dstIp: "10.0.1.201", protocol: "TCP", port: 80 },
    { id: "pkt_corp_to_wan", description: "Corporate → Internet HTTPS (allowed)", srcIntf: "LAN", dstIntf: "WAN", srcIp: "10.0.1.50", dstIp: "8.8.8.8", protocol: "TCP", port: 443 },
    { id: "pkt_wan_to_guest", description: "WAN → Guest subnet (blocked)", srcIntf: "WAN", dstIntf: "LAN", srcIp: "1.1.1.1", dstIp: "10.0.1.201", protocol: "TCP", port: 80 },
  ],
  expectedOutcomes: [
    { testPacketId: "pkt_guest_to_wan", expectedAction: "ACCEPT" },
    { testPacketId: "pkt_guest_to_corp", expectedAction: "DENY" },
    { testPacketId: "pkt_corp_to_guest", expectedAction: "DENY" },
    { testPacketId: "pkt_corp_to_wan", expectedAction: "ACCEPT" },
    { testPacketId: "pkt_wan_to_guest", expectedAction: "DENY" },
  ],
};

export const multiDmzAccessScenario: Scenario = {
  id: "multi-dmz-access-01",
  title: "Multi-Server DMZ Access Control",
  description:
    "The DMZ has three servers: Web Server (10.0.2.10), Mail Server (10.0.2.20), and " +
    "Management Server (10.0.2.30). Rules: (1) WAN can reach Web Server on HTTPS only. " +
    "(2) WAN can reach Mail Server on SMTP (port 25) only. " +
    "(3) Management Server is reachable ONLY from Corporate LAN on SSH — never from WAN. " +
    "(4) DMZ servers cannot initiate connections to LAN.",
  starterAddresses: [
    { id: "addr_webserver", name: "Web-Server", type: "subnet", value: "10.0.2.10/32" },
    { id: "addr_mailserver", name: "Mail-Server", type: "subnet", value: "10.0.2.20/32" },
    { id: "addr_mgmtserver", name: "Mgmt-Server", type: "subnet", value: "10.0.2.30/32" },
    { id: "addr_corp_lan", name: "Corporate-LAN", type: "subnet", value: "10.0.1.0/24" },
    { id: "addr_dmz_all", name: "DMZ-all", type: "subnet", value: "10.0.2.0/24" },
    { id: "addr_all", name: "all", type: "subnet", value: "0.0.0.0/0" },
  ],
  starterServices: [
    { id: "svc_https", name: "HTTPS", protocol: "TCP", port: "443" },
    { id: "svc_smtp", name: "SMTP", protocol: "TCP", port: "25" },
    { id: "svc_ssh", name: "SSH", protocol: "TCP", port: "22" },
    { id: "svc_http", name: "HTTP", protocol: "TCP", port: "80" },
  ],
  testPackets: [
    { id: "pkt_wan_web_https", description: "WAN → Web Server HTTPS (allowed)", srcIntf: "WAN", dstIntf: "DMZ", srcIp: "1.1.1.1", dstIp: "10.0.2.10", protocol: "TCP", port: 443 },
    { id: "pkt_wan_web_http", description: "WAN → Web Server HTTP (blocked)", srcIntf: "WAN", dstIntf: "DMZ", srcIp: "1.1.1.1", dstIp: "10.0.2.10", protocol: "TCP", port: 80 },
    { id: "pkt_wan_mail_smtp", description: "WAN → Mail Server SMTP (allowed)", srcIntf: "WAN", dstIntf: "DMZ", srcIp: "1.1.1.1", dstIp: "10.0.2.20", protocol: "TCP", port: 25 },
    { id: "pkt_wan_mgmt_ssh", description: "WAN → Mgmt Server SSH (blocked, LAN only)", srcIntf: "WAN", dstIntf: "DMZ", srcIp: "1.1.1.1", dstIp: "10.0.2.30", protocol: "TCP", port: 22 },
    { id: "pkt_lan_mgmt_ssh", description: "Corporate LAN → Mgmt Server SSH (allowed)", srcIntf: "LAN", dstIntf: "DMZ", srcIp: "10.0.1.50", dstIp: "10.0.2.30", protocol: "TCP", port: 22 },
    { id: "pkt_dmz_to_lan", description: "DMZ → Corporate LAN (blocked)", srcIntf: "DMZ", dstIntf: "LAN", srcIp: "10.0.2.10", dstIp: "10.0.1.50", protocol: "TCP", port: 80 },
  ],
  expectedOutcomes: [
    { testPacketId: "pkt_wan_web_https", expectedAction: "ACCEPT" },
    { testPacketId: "pkt_wan_web_http", expectedAction: "DENY" },
    { testPacketId: "pkt_wan_mail_smtp", expectedAction: "ACCEPT" },
    { testPacketId: "pkt_wan_mgmt_ssh", expectedAction: "DENY" },
    { testPacketId: "pkt_lan_mgmt_ssh", expectedAction: "ACCEPT" },
    { testPacketId: "pkt_dmz_to_lan", expectedAction: "DENY" },
  ],
};
