export type PanTrack = "security" | "zones" | "nat";

export interface PanTask {
  id: string;
  title: string;
  description: string;
  difficulty: number; // 1-10
  isFinal?: boolean;
}

export const SECURITY_TASKS: PanTask[] = [
  {
    id: "pan-sec-01",
    title: "Basic Outbound Access",
    description: "Allow Trust zone users to browse the web (web-browsing, ssl) and use DNS. Block everything else with a deny-all at the bottom.",
    difficulty: 2,
  },
  {
    id: "pan-sec-02",
    title: "DMZ Web Server",
    description: "Allow internet (Untrust) to reach a DMZ web server over HTTPS. Allow internal Trust users HTTP+HTTPS to DMZ. Block DMZ from initiating connections back to Trust.",
    difficulty: 4,
  },
  {
    id: "pan-sec-03",
    title: "App-ID Enforcement",
    description: "Block high-risk apps (bittorrent, rdp) for all users. Allow general web access. Ensure block rules sit above allow rules.",
    difficulty: 5,
  },
  {
    id: "pan-sec-04",
    title: "Split Tunneling Prevention",
    description: "Users must ONLY use approved apps (web-browsing, ssl, dns, smtp). All other applications including ssh and ftp must be denied. Use App-ID, not ports.",
    difficulty: 6,
  },
  {
    id: "pan-sec-05",
    title: "Inter-Zone Trust Hierarchy",
    description: "Management zone can reach Trust and DMZ for admin purposes. Trust can reach DMZ for web. DMZ cannot reach Trust or Management. Untrust can only reach DMZ on ssl.",
    difficulty: 8,
  },
];

export const SECURITY_FINAL: PanTask = {
  id: "pan-sec-final",
  title: "Security Policy Final",
  description: "Build a complete policy set: allow web from Trust, expose DMZ server, block all risky apps, enforce the zone hierarchy. Pass all checks to complete the track.",
  difficulty: 10,
  isFinal: true,
};

export const ZONE_TASKS: PanTask[] = [
  {
    id: "pan-zone-01",
    title: "Basic Zone Setup",
    description: "Create Trust (Layer3, ethernet1/2), Untrust (Layer3, ethernet1/1), and DMZ (Layer3, ethernet1/3) zones. Set Untrust to 'strict' zone protection profile.",
    difficulty: 2,
  },
  {
    id: "pan-zone-02",
    title: "HA Zone Configuration",
    description: "Assign ethernet1/6 to HA zone as HA1 (control). Assign ethernet1/7 as HA2 (data sync). HA interfaces must use 'ha' type, not layer3.",
    difficulty: 4,
  },
  {
    id: "pan-zone-03",
    title: "Management Isolation",
    description: "Create a dedicated Management zone on ethernet1/8. Set it to 'management' type. Ensure it has log forwarding enabled. Never share management with data-plane zones.",
    difficulty: 5,
  },
];

export const ZONE_FINAL: PanTask = {
  id: "pan-zone-final",
  title: "Zone Design Final",
  description: "Design the complete zone layout for a branch office: Trust, Untrust, DMZ, HA pair, and isolated Management zone. All interfaces assigned correctly.",
  difficulty: 9,
  isFinal: true,
};

export const NAT_TASKS: PanTask[] = [
  {
    id: "pan-nat-01",
    title: "Outbound SNAT",
    description: "Configure Source NAT so internal Trust hosts (10.0.0.0/24) can access the internet through the WAN interface IP. Use dynamic-ip-and-port translation.",
    difficulty: 3,
  },
  {
    id: "pan-nat-02",
    title: "Web Server DNAT",
    description: "Publish a DMZ web server (10.0.1.10) to the internet. Incoming HTTPS on public IP 203.0.113.10 should be forwarded to the internal server on port 443.",
    difficulty: 5,
  },
  {
    id: "pan-nat-03",
    title: "Static NAT for Mail Server",
    description: "A mail server needs a dedicated public IP. Create a static 1:1 NAT mapping 203.0.113.20 ↔ 10.0.1.20 for bidirectional traffic.",
    difficulty: 6,
  },
];

export const NAT_FINAL: PanTask = {
  id: "pan-nat-final",
  title: "NAT Policy Final",
  description: "Configure complete NAT: outbound SNAT for all Trust hosts, DNAT for web and mail servers in DMZ, and a static NAT for a dedicated management server.",
  difficulty: 9,
  isFinal: true,
};

export const TRACK_META: Record<PanTrack, { label: string; color: string; icon: string; path: string }> = {
  security: { label: "Security Policy", color: "#fa4616", icon: "🛡",  path: "/paloalto/tasks/security" },
  zones:    { label: "Zone Config",     color: "#3b82f6", icon: "◎",  path: "/paloalto/tasks/zones"    },
  nat:      { label: "NAT Policy",      color: "#7c3aed", icon: "↔",  path: "/paloalto/tasks/nat"      },
};

export const TRACK_TASKS: Record<PanTrack, PanTask[]> = {
  security: SECURITY_TASKS,
  zones:    ZONE_TASKS,
  nat:      NAT_TASKS,
};

export const TRACK_FINALS: Record<PanTrack, PanTask> = {
  security: SECURITY_FINAL,
  zones:    ZONE_FINAL,
  nat:      NAT_FINAL,
};
