import { Scenario } from "../../policy/types";

export const webFilterScenario: Scenario = {
  id: "web-filter-instagram-01",
  title: "Block Instagram",
  description:
    "Your company policy requires blocking Instagram (instagram.com) for all internal " +
    "LAN users while keeping general internet access available. Create a Web Filter " +
    "profile that blocks instagram.com, then attach it to the policy that allows " +
    "LAN-to-WAN HTTP/HTTPS traffic. General web browsing must still work.",
  starterAddresses: [
    { id: "addr_lan", name: "LAN-Network", type: "subnet", value: "10.0.1.0/24" },
    { id: "addr_all", name: "all", type: "subnet", value: "0.0.0.0/0" },
  ],
  starterServices: [
    { id: "svc_http", name: "HTTP", protocol: "TCP", port: "80" },
    { id: "svc_https", name: "HTTPS", protocol: "TCP", port: "443" },
  ],
  starterWebFilterProfiles: [],
  testPackets: [
    { id: "pkt_instagram_blocked", description: "LAN user → instagram.com HTTPS (must be blocked by Web Filter)", srcIntf: "LAN", dstIntf: "WAN", srcIp: "10.0.1.50", dstIp: "31.13.70.36", protocol: "TCP", port: 443, domain: "instagram.com" },
    { id: "pkt_github_allowed", description: "LAN user → github.com HTTPS (should be allowed)", srcIntf: "LAN", dstIntf: "WAN", srcIp: "10.0.1.50", dstIp: "140.82.112.4", protocol: "TCP", port: 443, domain: "github.com" },
    { id: "pkt_instagram_http_blocked", description: "LAN user → instagram.com HTTP (must be blocked)", srcIntf: "LAN", dstIntf: "WAN", srcIp: "10.0.1.50", dstIp: "31.13.70.36", protocol: "TCP", port: 80, domain: "instagram.com" },
    { id: "pkt_google_allowed", description: "LAN user → google.com HTTPS (should be allowed)", srcIntf: "LAN", dstIntf: "WAN", srcIp: "10.0.1.50", dstIp: "142.250.80.46", protocol: "TCP", port: 443, domain: "google.com" },
  ],
  expectedOutcomes: [
    { testPacketId: "pkt_instagram_blocked", expectedAction: "DENY" },
    { testPacketId: "pkt_github_allowed", expectedAction: "ACCEPT" },
    { testPacketId: "pkt_instagram_http_blocked", expectedAction: "DENY" },
    { testPacketId: "pkt_google_allowed", expectedAction: "ACCEPT" },
  ],
};
