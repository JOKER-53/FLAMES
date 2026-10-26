import type { Scenario } from "../../policy/types";

/** Additional packet-policy practice. Private grading outcomes are stripped by the API. */
export const PRACTICE_SCENARIOS: Scenario[] = [
  {
    "id": "dns-resolver-01",
    "title": "Approved DNS Resolver",
    "description": "Office clients (10.20.0.0/24) may query only Resolver (10.30.0.53) in DMZ using UDP/53 and TCP/53. Deny DNS to public resolvers, other DMZ hosts, and resolver-initiated traffic to LAN. Log both approved DNS services.",
    "starterAddresses": [
      {
        "id": "addr_lan",
        "name": "Office",
        "type": "subnet",
        "value": "10.20.0.0/24"
      },
      {
        "id": "addr_dns",
        "name": "Resolver",
        "type": "subnet",
        "value": "10.30.0.53/32"
      },
      {
        "id": "addr_all",
        "name": "all",
        "type": "subnet",
        "value": "0.0.0.0/0"
      }
    ],
    "starterServices": [
      {
        "id": "svc_dns-udp",
        "name": "DNS-UDP",
        "protocol": "UDP",
        "port": "53"
      },
      {
        "id": "svc_dns-tcp",
        "name": "DNS-TCP",
        "protocol": "TCP",
        "port": "53"
      },
      {
        "id": "svc_https",
        "name": "HTTPS",
        "protocol": "TCP",
        "port": "443"
      }
    ],
    "testPackets": [
      {
        "id": "dns-resolver-01-packet-1",
        "description": "10.20.0.25 \u2192 10.30.0.53: UDP/53",
        "srcIntf": "LAN",
        "dstIntf": "DMZ",
        "srcIp": "10.20.0.25",
        "dstIp": "10.30.0.53",
        "protocol": "UDP",
        "port": 53
      },
      {
        "id": "dns-resolver-01-packet-2",
        "description": "10.20.0.25 \u2192 10.30.0.53: TCP/53",
        "srcIntf": "LAN",
        "dstIntf": "DMZ",
        "srcIp": "10.20.0.25",
        "dstIp": "10.30.0.53",
        "protocol": "TCP",
        "port": 53
      },
      {
        "id": "dns-resolver-01-packet-3",
        "description": "10.20.0.25 \u2192 203.0.113.53: UDP/53",
        "srcIntf": "LAN",
        "dstIntf": "WAN",
        "srcIp": "10.20.0.25",
        "dstIp": "203.0.113.53",
        "protocol": "UDP",
        "port": 53
      },
      {
        "id": "dns-resolver-01-packet-4",
        "description": "10.20.0.25 \u2192 10.30.0.54: UDP/53",
        "srcIntf": "LAN",
        "dstIntf": "DMZ",
        "srcIp": "10.20.0.25",
        "dstIp": "10.30.0.54",
        "protocol": "UDP",
        "port": 53
      },
      {
        "id": "dns-resolver-01-packet-5",
        "description": "10.30.0.53 \u2192 10.20.0.25: TCP/53",
        "srcIntf": "DMZ",
        "dstIntf": "LAN",
        "srcIp": "10.30.0.53",
        "dstIp": "10.20.0.25",
        "protocol": "TCP",
        "port": 53
      },
      {
        "id": "dns-resolver-01-packet-6",
        "description": "10.20.0.25 \u2192 10.30.0.53: TCP/443",
        "srcIntf": "LAN",
        "dstIntf": "DMZ",
        "srcIp": "10.20.0.25",
        "dstIp": "10.30.0.53",
        "protocol": "TCP",
        "port": 443
      }
    ],
    "expectedOutcomes": [
      {
        "testPacketId": "dns-resolver-01-packet-1",
        "expectedAction": "ACCEPT",
        "expectedLog": true
      },
      {
        "testPacketId": "dns-resolver-01-packet-2",
        "expectedAction": "ACCEPT",
        "expectedLog": true
      },
      {
        "testPacketId": "dns-resolver-01-packet-3",
        "expectedAction": "DENY"
      },
      {
        "testPacketId": "dns-resolver-01-packet-4",
        "expectedAction": "DENY"
      },
      {
        "testPacketId": "dns-resolver-01-packet-5",
        "expectedAction": "DENY"
      },
      {
        "testPacketId": "dns-resolver-01-packet-6",
        "expectedAction": "DENY"
      }
    ]
  },
  {
    "id": "admin-jump-host-01",
    "title": "Restricted Administration Path",
    "description": "Only Admin-PC (10.20.0.10) may SSH to App-Server (10.30.0.10) in DMZ. Log that access. Other office clients, WAN sources, other DMZ destinations, and other services must be denied. This is forwarded server administration, not firewall management access.",
    "starterAddresses": [
      {
        "id": "addr_lan",
        "name": "Office",
        "type": "subnet",
        "value": "10.20.0.0/24"
      },
      {
        "id": "addr_admin",
        "name": "Admin-PC",
        "type": "subnet",
        "value": "10.20.0.10/32"
      },
      {
        "id": "addr_server",
        "name": "App-Server",
        "type": "subnet",
        "value": "10.30.0.10/32"
      },
      {
        "id": "addr_all",
        "name": "all",
        "type": "subnet",
        "value": "0.0.0.0/0"
      }
    ],
    "starterServices": [
      {
        "id": "svc_https",
        "name": "HTTPS",
        "protocol": "TCP",
        "port": "443"
      },
      {
        "id": "svc_ssh",
        "name": "SSH",
        "protocol": "TCP",
        "port": "22"
      }
    ],
    "testPackets": [
      {
        "id": "admin-jump-host-01-packet-1",
        "description": "10.20.0.10 \u2192 10.30.0.10: TCP/22",
        "srcIntf": "LAN",
        "dstIntf": "DMZ",
        "srcIp": "10.20.0.10",
        "dstIp": "10.30.0.10",
        "protocol": "TCP",
        "port": 22
      },
      {
        "id": "admin-jump-host-01-packet-2",
        "description": "10.20.0.11 \u2192 10.30.0.10: TCP/22",
        "srcIntf": "LAN",
        "dstIntf": "DMZ",
        "srcIp": "10.20.0.11",
        "dstIp": "10.30.0.10",
        "protocol": "TCP",
        "port": 22
      },
      {
        "id": "admin-jump-host-01-packet-3",
        "description": "203.0.113.5 \u2192 10.30.0.10: TCP/22",
        "srcIntf": "WAN",
        "dstIntf": "DMZ",
        "srcIp": "203.0.113.5",
        "dstIp": "10.30.0.10",
        "protocol": "TCP",
        "port": 22
      },
      {
        "id": "admin-jump-host-01-packet-4",
        "description": "10.20.0.10 \u2192 10.30.0.11: TCP/22",
        "srcIntf": "LAN",
        "dstIntf": "DMZ",
        "srcIp": "10.20.0.10",
        "dstIp": "10.30.0.11",
        "protocol": "TCP",
        "port": 22
      },
      {
        "id": "admin-jump-host-01-packet-5",
        "description": "10.20.0.10 \u2192 10.30.0.10: TCP/443",
        "srcIntf": "LAN",
        "dstIntf": "DMZ",
        "srcIp": "10.20.0.10",
        "dstIp": "10.30.0.10",
        "protocol": "TCP",
        "port": 443
      }
    ],
    "expectedOutcomes": [
      {
        "testPacketId": "admin-jump-host-01-packet-1",
        "expectedAction": "ACCEPT",
        "expectedLog": true
      },
      {
        "testPacketId": "admin-jump-host-01-packet-2",
        "expectedAction": "DENY"
      },
      {
        "testPacketId": "admin-jump-host-01-packet-3",
        "expectedAction": "DENY"
      },
      {
        "testPacketId": "admin-jump-host-01-packet-4",
        "expectedAction": "DENY"
      },
      {
        "testPacketId": "admin-jump-host-01-packet-5",
        "expectedAction": "DENY"
      }
    ]
  },
  {
    "id": "quarantine-exception-01",
    "title": "Quarantine Before Broad Access",
    "description": "Office clients may reach WAN on HTTPS, except Quarantined-PC (10.20.0.99), which must be explicitly denied and logged. Place its deny above the broader office allow. Log allowed HTTPS too. Deny HTTP and DMZ access.",
    "starterAddresses": [
      {
        "id": "addr_lan",
        "name": "Office",
        "type": "subnet",
        "value": "10.20.0.0/24"
      },
      {
        "id": "addr_blocked",
        "name": "Quarantined-PC",
        "type": "subnet",
        "value": "10.20.0.99/32"
      },
      {
        "id": "addr_dmz",
        "name": "DMZ",
        "type": "subnet",
        "value": "10.30.0.0/24"
      },
      {
        "id": "addr_all",
        "name": "all",
        "type": "subnet",
        "value": "0.0.0.0/0"
      }
    ],
    "starterServices": [
      {
        "id": "svc_https",
        "name": "HTTPS",
        "protocol": "TCP",
        "port": "443"
      },
      {
        "id": "svc_http",
        "name": "HTTP",
        "protocol": "TCP",
        "port": "80"
      }
    ],
    "testPackets": [
      {
        "id": "quarantine-exception-01-packet-1",
        "description": "10.20.0.99 \u2192 203.0.113.10: TCP/443",
        "srcIntf": "LAN",
        "dstIntf": "WAN",
        "srcIp": "10.20.0.99",
        "dstIp": "203.0.113.10",
        "protocol": "TCP",
        "port": 443
      },
      {
        "id": "quarantine-exception-01-packet-2",
        "description": "10.20.0.25 \u2192 203.0.113.10: TCP/443",
        "srcIntf": "LAN",
        "dstIntf": "WAN",
        "srcIp": "10.20.0.25",
        "dstIp": "203.0.113.10",
        "protocol": "TCP",
        "port": 443
      },
      {
        "id": "quarantine-exception-01-packet-3",
        "description": "10.20.0.25 \u2192 203.0.113.10: TCP/80",
        "srcIntf": "LAN",
        "dstIntf": "WAN",
        "srcIp": "10.20.0.25",
        "dstIp": "203.0.113.10",
        "protocol": "TCP",
        "port": 80
      },
      {
        "id": "quarantine-exception-01-packet-4",
        "description": "10.20.0.25 \u2192 10.30.0.10: TCP/443",
        "srcIntf": "LAN",
        "dstIntf": "DMZ",
        "srcIp": "10.20.0.25",
        "dstIp": "10.30.0.10",
        "protocol": "TCP",
        "port": 443
      }
    ],
    "expectedOutcomes": [
      {
        "testPacketId": "quarantine-exception-01-packet-1",
        "expectedAction": "DENY",
        "expectedLog": true
      },
      {
        "testPacketId": "quarantine-exception-01-packet-2",
        "expectedAction": "ACCEPT",
        "expectedLog": true
      },
      {
        "testPacketId": "quarantine-exception-01-packet-3",
        "expectedAction": "DENY"
      },
      {
        "testPacketId": "quarantine-exception-01-packet-4",
        "expectedAction": "DENY"
      }
    ]
  },
  {
    "id": "monitoring-collector-01",
    "title": "Monitoring Collector Access",
    "description": "App-Server (10.30.0.10) may send UDP/514 syslog only to Collector (10.30.0.60), within DMZ. Admin-PC may reach Collector on HTTPS from LAN. Log both allowed flows. Deny collector-initiated LAN access, other senders, and other collector services.",
    "starterAddresses": [
      {
        "id": "addr_admin",
        "name": "Admin-PC",
        "type": "subnet",
        "value": "10.20.0.10/32"
      },
      {
        "id": "addr_server",
        "name": "App-Server",
        "type": "subnet",
        "value": "10.30.0.10/32"
      },
      {
        "id": "addr_monitor",
        "name": "Collector",
        "type": "subnet",
        "value": "10.30.0.60/32"
      },
      {
        "id": "addr_all",
        "name": "all",
        "type": "subnet",
        "value": "0.0.0.0/0"
      }
    ],
    "starterServices": [
      {
        "id": "svc_https",
        "name": "HTTPS",
        "protocol": "TCP",
        "port": "443"
      },
      {
        "id": "svc_ssh",
        "name": "SSH",
        "protocol": "TCP",
        "port": "22"
      },
      {
        "id": "svc_syslog",
        "name": "SYSLOG",
        "protocol": "UDP",
        "port": "514"
      }
    ],
    "testPackets": [
      {
        "id": "monitoring-collector-01-packet-1",
        "description": "10.30.0.10 \u2192 10.30.0.60: UDP/514",
        "srcIntf": "DMZ",
        "dstIntf": "DMZ",
        "srcIp": "10.30.0.10",
        "dstIp": "10.30.0.60",
        "protocol": "UDP",
        "port": 514
      },
      {
        "id": "monitoring-collector-01-packet-2",
        "description": "10.20.0.10 \u2192 10.30.0.60: TCP/443",
        "srcIntf": "LAN",
        "dstIntf": "DMZ",
        "srcIp": "10.20.0.10",
        "dstIp": "10.30.0.60",
        "protocol": "TCP",
        "port": 443
      },
      {
        "id": "monitoring-collector-01-packet-3",
        "description": "10.30.0.60 \u2192 10.20.0.10: TCP/443",
        "srcIntf": "DMZ",
        "dstIntf": "LAN",
        "srcIp": "10.30.0.60",
        "dstIp": "10.20.0.10",
        "protocol": "TCP",
        "port": 443
      },
      {
        "id": "monitoring-collector-01-packet-4",
        "description": "10.30.0.11 \u2192 10.30.0.60: UDP/514",
        "srcIntf": "DMZ",
        "dstIntf": "DMZ",
        "srcIp": "10.30.0.11",
        "dstIp": "10.30.0.60",
        "protocol": "UDP",
        "port": 514
      },
      {
        "id": "monitoring-collector-01-packet-5",
        "description": "10.20.0.11 \u2192 10.30.0.60: TCP/443",
        "srcIntf": "LAN",
        "dstIntf": "DMZ",
        "srcIp": "10.20.0.11",
        "dstIp": "10.30.0.60",
        "protocol": "TCP",
        "port": 443
      },
      {
        "id": "monitoring-collector-01-packet-6",
        "description": "10.30.0.10 \u2192 10.30.0.60: TCP/22",
        "srcIntf": "DMZ",
        "dstIntf": "DMZ",
        "srcIp": "10.30.0.10",
        "dstIp": "10.30.0.60",
        "protocol": "TCP",
        "port": 22
      }
    ],
    "expectedOutcomes": [
      {
        "testPacketId": "monitoring-collector-01-packet-1",
        "expectedAction": "ACCEPT",
        "expectedLog": true
      },
      {
        "testPacketId": "monitoring-collector-01-packet-2",
        "expectedAction": "ACCEPT",
        "expectedLog": true
      },
      {
        "testPacketId": "monitoring-collector-01-packet-3",
        "expectedAction": "DENY"
      },
      {
        "testPacketId": "monitoring-collector-01-packet-4",
        "expectedAction": "DENY"
      },
      {
        "testPacketId": "monitoring-collector-01-packet-5",
        "expectedAction": "DENY"
      },
      {
        "testPacketId": "monitoring-collector-01-packet-6",
        "expectedAction": "DENY"
      }
    ]
  },
  {
    "id": "time-service-01",
    "title": "Controlled Time Synchronization",
    "description": "Office clients may reach only public time server 203.0.113.123 on UDP/123 through WAN. Log approved synchronization. Deny TCP/123, other time servers, web access, and unsolicited inbound NTP.",
    "starterAddresses": [
      {
        "id": "addr_lan",
        "name": "Office",
        "type": "subnet",
        "value": "10.20.0.0/24"
      },
      {
        "id": "addr_all",
        "name": "all",
        "type": "subnet",
        "value": "0.0.0.0/0"
      },
      {
        "id": "addr_time",
        "name": "Approved-Time",
        "type": "subnet",
        "value": "203.0.113.123/32"
      }
    ],
    "starterServices": [
      {
        "id": "svc_https",
        "name": "HTTPS",
        "protocol": "TCP",
        "port": "443"
      },
      {
        "id": "svc_ntp",
        "name": "NTP",
        "protocol": "UDP",
        "port": "123"
      }
    ],
    "testPackets": [
      {
        "id": "time-service-01-packet-1",
        "description": "10.20.0.25 \u2192 203.0.113.123: UDP/123",
        "srcIntf": "LAN",
        "dstIntf": "WAN",
        "srcIp": "10.20.0.25",
        "dstIp": "203.0.113.123",
        "protocol": "UDP",
        "port": 123
      },
      {
        "id": "time-service-01-packet-2",
        "description": "10.20.0.25 \u2192 203.0.113.123: TCP/123",
        "srcIntf": "LAN",
        "dstIntf": "WAN",
        "srcIp": "10.20.0.25",
        "dstIp": "203.0.113.123",
        "protocol": "TCP",
        "port": 123
      },
      {
        "id": "time-service-01-packet-3",
        "description": "10.20.0.25 \u2192 203.0.113.124: UDP/123",
        "srcIntf": "LAN",
        "dstIntf": "WAN",
        "srcIp": "10.20.0.25",
        "dstIp": "203.0.113.124",
        "protocol": "UDP",
        "port": 123
      },
      {
        "id": "time-service-01-packet-4",
        "description": "203.0.113.123 \u2192 10.20.0.25: UDP/123",
        "srcIntf": "WAN",
        "dstIntf": "LAN",
        "srcIp": "203.0.113.123",
        "dstIp": "10.20.0.25",
        "protocol": "UDP",
        "port": 123
      },
      {
        "id": "time-service-01-packet-5",
        "description": "10.20.0.25 \u2192 203.0.113.123: TCP/443",
        "srcIntf": "LAN",
        "dstIntf": "WAN",
        "srcIp": "10.20.0.25",
        "dstIp": "203.0.113.123",
        "protocol": "TCP",
        "port": 443
      }
    ],
    "expectedOutcomes": [
      {
        "testPacketId": "time-service-01-packet-1",
        "expectedAction": "ACCEPT",
        "expectedLog": true
      },
      {
        "testPacketId": "time-service-01-packet-2",
        "expectedAction": "DENY"
      },
      {
        "testPacketId": "time-service-01-packet-3",
        "expectedAction": "DENY"
      },
      {
        "testPacketId": "time-service-01-packet-4",
        "expectedAction": "DENY"
      },
      {
        "testPacketId": "time-service-01-packet-5",
        "expectedAction": "DENY"
      }
    ]
  },
  {
    "id": "partner-allowlist-01",
    "title": "Partner Source Allowlist",
    "description": "Only partner network 198.51.100.0/28 may reach App-Server (10.30.0.10) in DMZ on HTTPS from WAN. Log approved access. Deny an adjacent partner subnet, other services, other DMZ hosts, and DMZ-initiated connections to the partner.",
    "starterAddresses": [
      {
        "id": "addr_server",
        "name": "App-Server",
        "type": "subnet",
        "value": "10.30.0.10/32"
      },
      {
        "id": "addr_all",
        "name": "all",
        "type": "subnet",
        "value": "0.0.0.0/0"
      },
      {
        "id": "addr_partner",
        "name": "Partner",
        "type": "subnet",
        "value": "198.51.100.0/28"
      }
    ],
    "starterServices": [
      {
        "id": "svc_https",
        "name": "HTTPS",
        "protocol": "TCP",
        "port": "443"
      },
      {
        "id": "svc_ssh",
        "name": "SSH",
        "protocol": "TCP",
        "port": "22"
      },
      {
        "id": "svc_http",
        "name": "HTTP",
        "protocol": "TCP",
        "port": "80"
      }
    ],
    "testPackets": [
      {
        "id": "partner-allowlist-01-packet-1",
        "description": "198.51.100.5 \u2192 10.30.0.10: TCP/443",
        "srcIntf": "WAN",
        "dstIntf": "DMZ",
        "srcIp": "198.51.100.5",
        "dstIp": "10.30.0.10",
        "protocol": "TCP",
        "port": 443
      },
      {
        "id": "partner-allowlist-01-packet-2",
        "description": "198.51.100.17 \u2192 10.30.0.10: TCP/443",
        "srcIntf": "WAN",
        "dstIntf": "DMZ",
        "srcIp": "198.51.100.17",
        "dstIp": "10.30.0.10",
        "protocol": "TCP",
        "port": 443
      },
      {
        "id": "partner-allowlist-01-packet-3",
        "description": "198.51.100.5 \u2192 10.30.0.10: TCP/80",
        "srcIntf": "WAN",
        "dstIntf": "DMZ",
        "srcIp": "198.51.100.5",
        "dstIp": "10.30.0.10",
        "protocol": "TCP",
        "port": 80
      },
      {
        "id": "partner-allowlist-01-packet-4",
        "description": "198.51.100.5 \u2192 10.30.0.11: TCP/443",
        "srcIntf": "WAN",
        "dstIntf": "DMZ",
        "srcIp": "198.51.100.5",
        "dstIp": "10.30.0.11",
        "protocol": "TCP",
        "port": 443
      },
      {
        "id": "partner-allowlist-01-packet-5",
        "description": "10.30.0.10 \u2192 198.51.100.5: TCP/443",
        "srcIntf": "DMZ",
        "dstIntf": "WAN",
        "srcIp": "10.30.0.10",
        "dstIp": "198.51.100.5",
        "protocol": "TCP",
        "port": 443
      }
    ],
    "expectedOutcomes": [
      {
        "testPacketId": "partner-allowlist-01-packet-1",
        "expectedAction": "ACCEPT",
        "expectedLog": true
      },
      {
        "testPacketId": "partner-allowlist-01-packet-2",
        "expectedAction": "DENY"
      },
      {
        "testPacketId": "partner-allowlist-01-packet-3",
        "expectedAction": "DENY"
      },
      {
        "testPacketId": "partner-allowlist-01-packet-4",
        "expectedAction": "DENY"
      },
      {
        "testPacketId": "partner-allowlist-01-packet-5",
        "expectedAction": "DENY"
      }
    ]
  }
];
