// ============================================================================
// Course structure for both vendors: modules → lessons. The shell, overview,
// module pages, and "next lesson" navigation all read from here.
// Policy lesson titles are listed as plain data rather than imported from the
// engine so the frontend bundle never includes their answer keys.
// ============================================================================
import type { IconName } from "../components/ui/Icon";
import type { LessonStatus } from "../components/ui/primitives";

export type Vendor = "fortigate" | "paloalto";
export type Level = "Foundation" | "Intermediate" | "Advanced";

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  level: Level;
  route: string;
  /** Final assessments unlock once every other lesson in the module is complete. */
  final?: boolean;
}

export interface Module {
  id: string;
  title: string;
  summary: string;
  icon: IconName;
  lessons: Lesson[];
}

export interface ReferenceLink { label: string; path: string; icon: IconName; }

export interface Course {
  vendor: Vendor;
  name: string;
  product: string;
  os: string;
  base: string;
  modules: Module[];
  reference: ReferenceLink[];
}

const fg = (id: string, title: string, summary: string, minutes: number, level: Level, route: string, final = false): Lesson =>
  ({ id, title, summary, minutes, level, route, final });

const policyRoute = (id: string) => `/fortigate/policy/firewall-policy?scenario=${id}`;
const ifaceRoute = (id: string) => `/fortigate/network/interfaces?track=interface&scenario=${id}`;
const portRoute = (id: string) => `/fortigate/network/interfaces?track=port&scenario=${id}`;

export const FORTIGATE_COURSE: Course = {
  vendor: "fortigate",
  name: "FortiGate Firewall Administration",
  product: "FortiGate 60F",
  os: "FortiOS 7.6",
  base: "/fortigate",
  modules: [
    {
      id: "policy", title: "Firewall Policy", icon: "shieldCheck",
      summary: "Write ordered, least-privilege policies and see why first-match-wins matters.",
      lessons: [
        fg("web-server-access-01", "Web Server Access", "Publish one DMZ server over HTTPS and nothing else.", 10, "Foundation", policyRoute("web-server-access-01")),
        fg("db-lockdown-01", "Database Server Lockdown", "Restrict a database to its SQL port from one subnet.", 12, "Foundation", policyRoute("db-lockdown-01")),
        fg("dmz-multi-service-01", "DMZ Multi-Service", "Allow several inbound services to a single DMZ host.", 12, "Foundation", policyRoute("dmz-multi-service-01")),
        fg("inter-zone-trust-01", "Inter-Zone Trust", "Let LAN reach the DMZ without letting the DMZ reach back.", 15, "Intermediate", policyRoute("inter-zone-trust-01")),
        fg("full-network-policy-01", "Full Network Policy", "Compose a complete small-network policy set.", 20, "Intermediate", policyRoute("full-network-policy-01")),
        fg("multi-system-block-01", "Block One Host", "Carve one system out of a subnet-wide allow rule.", 12, "Intermediate", policyRoute("multi-system-block-01")),
        fg("web-filter-instagram-01", "Web Filtering", "Block a site that IP and port rules cannot reliably stop.", 15, "Intermediate", policyRoute("web-filter-instagram-01")),
        fg("server-segmentation-01", "Server Segmentation", "Enforce one-way access between workstations and servers.", 15, "Advanced", policyRoute("server-segmentation-01")),
        fg("guest-isolation-01", "Guest Network Isolation", "Isolate two subnets that share a zone.", 15, "Advanced", policyRoute("guest-isolation-01")),
        fg("multi-dmz-access-01", "Multi-Server DMZ Access", "Different exposure for each server in the same DMZ.", 18, "Advanced", policyRoute("multi-dmz-access-01")),
        fg("firewall-final-01", "Firewall Policy Assessment", "Everything in this module, in one network.", 30, "Advanced", policyRoute("firewall-final-01"), true),
      ],
    },
    {
      id: "interface", title: "Interfaces", icon: "network",
      summary: "Address interfaces, choose roles, and limit administrative access.",
      lessons: [
        fg("interface-ip-01", "Interface IP Assignment", "Give each interface the right address and mask.", 10, "Foundation", ifaceRoute("interface-ip-01")),
        fg("interface-access-01", "Administrative Access", "Decide which management protocols each interface allows.", 10, "Foundation", ifaceRoute("interface-access-01")),
        fg("interface-custom-01", "Custom Addressing Scheme", "Work from a non-default branch address plan.", 15, "Intermediate", ifaceRoute("interface-custom-01")),
        fg("interface-full-01", "Interfaces Assessment", "Configure every interface from scratch.", 25, "Advanced", ifaceRoute("interface-full-01"), true),
      ],
    },
    {
      id: "port", title: "Port Assignment", icon: "plug",
      summary: "Cable the chassis and assign each physical port to the right zone.",
      lessons: [
        fg("port-assignment-01", "Basic Port Assignment", "WAN, LAN, and DMZ on a small office firewall.", 8, "Foundation", portRoute("port-assignment-01")),
        fg("port-multi-dmz-01", "Multi-Server DMZ", "Give two public servers their own DMZ ports.", 10, "Foundation", portRoute("port-multi-dmz-01")),
        fg("port-redundant-wan-01", "Redundant WAN Uplinks", "Connect two ISPs for failover.", 10, "Intermediate", portRoute("port-redundant-wan-01")),
        fg("port-large-office-01", "Larger Office Network", "Scale the LAN and leave spare ports unused.", 12, "Intermediate", portRoute("port-large-office-01")),
        fg("port-position-trap-01", "Don't Assume by Position", "Zone by what is connected, not where the port sits.", 12, "Advanced", portRoute("port-position-trap-01")),
        fg("port-final-01", "Port Assignment Assessment", "Every port concept on one chassis.", 20, "Advanced", portRoute("port-final-01"), true),
      ],
    },
    { id: "practice", title: "Operations Practice", icon: "shieldCheck", summary: "Apply least privilege to DNS, monitoring, administration, and partner access.", lessons: [
      fg("dns-resolver-01", "Approved DNS Resolver", "Permit both DNS transports to one approved resolver.", 15, "Intermediate", policyRoute("dns-resolver-01")),
      fg("admin-jump-host-01", "Restricted Administration Path", "Restrict server SSH to a single administrator workstation.", 15, "Intermediate", policyRoute("admin-jump-host-01")),
      fg("quarantine-exception-01", "Quarantine Before Broad Access", "Block and log a quarantined host before broader HTTPS access.", 15, "Intermediate", policyRoute("quarantine-exception-01")),
      fg("monitoring-collector-01", "Monitoring Collector Access", "Separate one-way telemetry from collector administration.", 15, "Intermediate", policyRoute("monitoring-collector-01")),
      fg("time-service-01", "Controlled Time Synchronization", "Limit time synchronization to an approved server and protocol.", 15, "Intermediate", policyRoute("time-service-01")),
      fg("partner-allowlist-01", "Partner Source Allowlist", "Expose HTTPS only to the exact partner source range.", 15, "Intermediate", policyRoute("partner-allowlist-01")),
    ] },
    {
      id: "routing", title: "Routing", icon: "route",
      summary: "Traffic has to route before policy can allow it.",
      lessons: [
        fg("routing-static-01", "Default Static Route", "Send internet-bound traffic to the ISP gateway.", 10, "Foundation", "/fortigate/network/routing"),
      ],
    },
  ],
  reference: [
    { label: "Learning guide", path: "/fortigate/learn", icon: "book" },
    { label: "Hardware & cabling", path: "/fortigate/hardware", icon: "server" },
    { label: "Address objects", path: "/fortigate/policy/addresses", icon: "grid" },
    { label: "Service objects", path: "/fortigate/policy/services", icon: "layers" },
  ],
};

const pan = (id: string, title: string, summary: string, minutes: number, level: Level, page: string, final = false): Lesson =>
  ({ id, title, summary, minutes, level, route: `/paloalto/${page}?task=${id}`, final });

export const PALOALTO_COURSE: Course = {
  vendor: "paloalto",
  name: "Palo Alto Networks Firewall Essentials",
  product: "PA-220",
  os: "PAN-OS 11",
  base: "/paloalto",
  modules: [
    {
      id: "security", title: "Security Policy", icon: "shieldCheck",
      summary: "Match on App-ID and zones, and order rules so the right one wins.",
      lessons: [
        pan("pan-sec-01", "Basic Outbound Access", "Allow approved web applications, then deny the rest.", 10, "Foundation", "security"),
        pan("pan-sec-02", "DMZ Web Server", "Expose a DMZ server without opening the path back to Trust.", 12, "Foundation", "security"),
        pan("pan-sec-03", "App-ID Enforcement", "Block risky applications whatever port they use.", 12, "Intermediate", "security"),
        pan("pan-sec-04", "Approved Application List", "Allow only named applications by App-ID.", 15, "Intermediate", "security"),
        pan("pan-sec-05", "Inter-Zone Trust Hierarchy", "Build asymmetric trust between four zones.", 18, "Advanced", "security"),
        pan("pan-sec-final", "Security Policy Assessment", "A complete rulebase for a multi-zone branch.", 30, "Advanced", "security", true),
      ],
    },
    { id: "practice", title: "Operations Practice", icon: "shieldCheck", summary: "Design application-specific paths and isolate administration and mail traffic.", lessons: [
      pan("pan-sec-dns", "DNS-Only Egress", "Trust \u2192 Untrust may use dns only.", 15, "Intermediate", "security"),
      pan("pan-sec-admin", "Dedicated Administration Zone", "Allow only ssh from Management to Trust and DMZ.", 15, "Intermediate", "security"),
      pan("pan-sec-mail", "DMZ Mail Relay Isolation", "Allow smtp from Untrust to DMZ and from DMZ to Untrust only.", 15, "Intermediate", "security"),
    ] },
    {
      id: "zones", title: "Zones", icon: "layers",
      summary: "Group interfaces by trust, and keep HA and management apart.",
      lessons: [
        pan("pan-zone-01", "Basic Zone Setup", "Create Trust, Untrust, and DMZ Layer 3 zones.", 10, "Foundation", "zones"),
        pan("pan-zone-02", "HA Zone Configuration", "Put HA links in an HA zone, never a data zone.", 12, "Intermediate", "zones"),
        pan("pan-zone-03", "Management Isolation", "Give management its own zone with log forwarding.", 12, "Intermediate", "zones"),
        pan("pan-zone-final", "Zone Design Assessment", "The complete zone layout for a branch office.", 25, "Advanced", "zones", true),
      ],
    },
    {
      id: "nat", title: "NAT", icon: "swap",
      summary: "Source, destination, and static NAT, and how they meet security policy.",
      lessons: [
        pan("pan-nat-01", "Outbound Source NAT", "Share the interface address with dynamic IP and port.", 10, "Foundation", "nat"),
        pan("pan-nat-02", "Web Server Destination NAT", "Forward a public address to a DMZ server.", 12, "Intermediate", "nat"),
        pan("pan-nat-03", "Static NAT", "Map a mail server 1:1 in both directions.", 12, "Intermediate", "nat"),
        pan("pan-nat-final", "NAT Assessment", "Combine SNAT, DNAT, and static NAT.", 25, "Advanced", "nat", true),
      ],
    },
    {
      id: "interfaces", title: "Interfaces & Ports", icon: "plug",
      summary: "Interface types, addressing, and cabling the PA-220 into zones.",
      lessons: [
        pan("pan-iface-01", "Interface Configuration", "Set interface types, addresses, and zones.", 15, "Foundation", "interfaces"),
        pan("pan-port-01", "Basic Port Assignment", "Cable Untrust and Trust on the PA-220.", 8, "Foundation", "port"),
        pan("pan-port-02", "DMZ & HA Ports", "Add a DMZ port and an HA link.", 10, "Intermediate", "port"),
      ],
    },
  ],
  reference: [
    { label: "Learning guide", path: "/paloalto/learn", icon: "book" },
    { label: "Hardware & cabling", path: "/paloalto/hardware", icon: "server" },
    { label: "App-ID reference", path: "/paloalto/appid", icon: "app" },
  ],
};

export const COURSES: Record<Vendor, Course> = { fortigate: FORTIGATE_COURSE, paloalto: PALOALTO_COURSE };

export const allLessons = (course: Course) => course.modules.flatMap(m => m.lessons);
export const courseMinutes = (course: Course) => allLessons(course).reduce((n, l) => n + l.minutes, 0);

export function lessonStatus(module: Module, lesson: Lesson, done: Set<string>, currentId?: string): LessonStatus {
  if (done.has(lesson.id)) return "done";
  if (lesson.final && module.lessons.some(l => !l.final && !done.has(l.id))) return "locked";
  return lesson.id === currentId ? "current" : "todo";
}

export function moduleProgress(module: Module, done: Set<string>) {
  const completed = module.lessons.filter(l => done.has(l.id)).length;
  return { completed, total: module.lessons.length, pct: (completed / module.lessons.length) * 100 };
}

export function courseProgress(course: Course, done: Set<string>) {
  const lessons = allLessons(course);
  const completed = lessons.filter(l => done.has(l.id)).length;
  return { completed, total: lessons.length, pct: (completed / lessons.length) * 100 };
}

/** First unfinished, unlocked lesson in course order. */
export function nextLesson(course: Course, done: Set<string>): { module: Module; lesson: Lesson } | null {
  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      if (lessonStatus(module, lesson, done) === "todo") return { module, lesson };
    }
  }
  return null;
}

export function findLesson(course: Course, lessonId: string | null | undefined) {
  if (!lessonId) return null;
  for (const module of course.modules) {
    const index = module.lessons.findIndex(l => l.id === lessonId);
    if (index >= 0) return { module, lesson: module.lessons[index], index, next: module.lessons[index + 1] ?? null };
  }
  return null;
}
