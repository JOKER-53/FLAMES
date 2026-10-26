// ============================================================================
// Example Scenario: "Database Server Lockdown"
// Teaches rule-order sensitivity (first-match-wins). The student is asked
// to allow ONLY the app server to reach the database on its SQL port, and
// deny all other LAN traffic to it. The trap: if a broad "allow LAN to LAN"
// rule is placed before the specific db rule, it shadows the intended
// restriction -- the specific rule never gets evaluated for matching
// traffic since the broad rule already claimed it.
// ============================================================================

import { Scenario } from "../../policy/types";

export const dbLockdownScenario: Scenario = {
  id: "db-lockdown-01",
  title: "Database Server Lockdown",
  description:
    "An internal database server (10.0.1.50) must only be reachable on its " +
    "SQL port (TCP 5432) from the application server (10.0.1.10). All other " +
    "LAN traffic to the database server must be denied. Be careful about " +
    "policy order -- a rule placed earlier in the list is evaluated first.",
  topologyNote: "LAN (10.0.1.0/24): AppServer at 10.0.1.10, DBServer at 10.0.1.50",

  starterAddresses: [
    { id: "addr_appserver", name: "AppServer", type: "subnet", value: "10.0.1.10/32" },
    { id: "addr_dbserver", name: "DBServer", type: "subnet", value: "10.0.1.50/32" },
    { id: "addr_lan_all", name: "LAN-all", type: "subnet", value: "10.0.1.0/24" },
  ],

  starterServices: [
    { id: "svc_sql", name: "SQL", protocol: "TCP", port: "5432" },
    { id: "svc_ssh", name: "SSH", protocol: "TCP", port: "22" },
    { id: "svc_http", name: "HTTP", protocol: "TCP", port: "80" },
  ],

  testPackets: [
    {
      id: "pkt_appserver_sql_allowed",
      description: "AppServer -> DBServer on SQL (should be allowed)",
      srcIntf: "LAN",
      dstIntf: "LAN",
      srcIp: "10.0.1.10",
      dstIp: "10.0.1.50",
      protocol: "TCP",
      port: 5432,
    },
    {
      id: "pkt_other_host_sql_blocked",
      description: "Another LAN host -> DBServer on SQL (should be blocked, not AppServer)",
      srcIntf: "LAN",
      dstIntf: "LAN",
      srcIp: "10.0.1.77",
      dstIp: "10.0.1.50",
      protocol: "TCP",
      port: 5432,
    },
    {
      id: "pkt_appserver_ssh_blocked",
      description: "AppServer -> DBServer on SSH (should be blocked, SQL only)",
      srcIntf: "LAN",
      dstIntf: "LAN",
      srcIp: "10.0.1.10",
      dstIp: "10.0.1.50",
      protocol: "TCP",
      port: 22,
    },
    {
      id: "pkt_other_host_http_blocked",
      description: "Another LAN host -> DBServer on HTTP (should be blocked)",
      srcIntf: "LAN",
      dstIntf: "LAN",
      srcIp: "10.0.1.88",
      dstIp: "10.0.1.50",
      protocol: "TCP",
      port: 80,
    },
  ],

  expectedOutcomes: [
    { testPacketId: "pkt_appserver_sql_allowed", expectedAction: "ACCEPT" },
    { testPacketId: "pkt_other_host_sql_blocked", expectedAction: "DENY" },
    { testPacketId: "pkt_appserver_ssh_blocked", expectedAction: "DENY" },
    { testPacketId: "pkt_other_host_http_blocked", expectedAction: "DENY" },
  ],
};
