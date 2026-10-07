/** Simplified teaching models, not a complete PAN-OS dataplane or configuration schema. */
export interface PanSecurityRule { id: number; name: string; srcZone: string; dstZone: string; apps: string[]; action: "allow" | "deny"; }
export interface PanZone { id: number; name: string; type: "layer3" | "layer2" | "tap" | "ha" | "management"; profile: "none" | "default" | "strict"; interfaces: string[]; logForwarding: boolean; }
export interface PanNatRule { id: number; name: string; type: "source" | "destination" | "static"; srcZone: string; dstZone: string; dstAddr: string; translated: string; }
interface Check<T> { desc: string; fn: (config: T[]) => boolean; }
interface Exercise<T> { id: string; title: string; description: string; desc: string; hint: string; checks: Check<T>[]; }
const apps = ["web-browsing", "ssl", "dns", "ssh", "ftp", "smtp", "rdp", "bittorrent", "unknown-tcp"];
const zones = ["Trust", "Untrust", "DMZ", "Management"];

export function evaluatePanPacket(rules: PanSecurityRule[], src: string, dst: string, app: string): "allow" | "deny" {
  return rules.find(rule => (rule.srcZone === "any" || rule.srcZone === src) &&
    (rule.dstZone === "any" || rule.dstZone === dst) && (rule.apps.includes("any") || rule.apps.includes(app)))?.action ?? "deny";
}
const traffic = (src: string, dst: string, app: string, action: "allow" | "deny"): Check<PanSecurityRule> => ({
  desc: `${src} → ${dst}: ${app} traffic behavior`, fn: rules => evaluatePanPacket(rules, src, dst, app) === action,
});
const blockDirection = (src: string, dst: string): Check<PanSecurityRule> => ({
  desc: `${src} → ${dst}: isolation`, fn: rules => apps.every(app => evaluatePanPacket(rules, src, dst, app) === "deny"),
});
const denyBottom: Check<PanSecurityRule> = { desc: "Explicit catch-all deny at the bottom", fn: rules => {
  const last = rules[rules.length - 1];
  return !!last && last.action === "deny" && last.srcZone === "any" && last.dstZone === "any" && last.apps.includes("any");
} };
const outbound = ["web-browsing", "ssl", "dns"].map(app => traffic("Trust", "Untrust", app, "allow"));
const dmz = [traffic("Untrust", "DMZ", "ssl", "allow"), ...["web-browsing", "ssl"].map(app => traffic("Trust", "DMZ", app, "allow")), blockDirection("DMZ", "Trust")];
const risky: Check<PanSecurityRule>[] = ["bittorrent", "rdp"].map(app => ({
  desc: `${app}: denied across inter-zone paths`, fn: rules => zones.every(src => zones.every(dst => src === dst || evaluatePanPacket(rules, src, dst, app) === "deny")),
}));
const blockBeforeAllow: Check<PanSecurityRule> = { desc: "Explicit risky-app deny rules precede allow rules", fn: rules => {
  const firstAllow = rules.findIndex(rule => rule.action === "allow");
  return firstAllow >= 0 && ["bittorrent", "rdp"].every(app => {
    const block = rules.findIndex(rule => rule.action === "deny" && rule.srcZone === "any" && rule.dstZone === "any" && rule.apps.includes(app));
    return block >= 0 && block < firstAllow;
  });
} };
const hierarchy = [traffic("Management", "Trust", "ssh", "allow"), traffic("Management", "DMZ", "ssh", "allow"), ...dmz,
  blockDirection("Trust", "Management"), blockDirection("DMZ", "Management"), blockDirection("Untrust", "Trust"), blockDirection("Untrust", "Management"), traffic("Untrust", "DMZ", "web-browsing", "deny")];
function exercise<T>(id: string, title: string, description: string, checks: Check<T>[], hint = "Evaluate the complete configuration, including rule order and zone boundaries."): Exercise<T> {
  return { id, title, description, desc: description, hint, checks };
}

export const PAN_SECURITY_SCENARIOS = [
  exercise("pan-sec-01", "Basic Outbound Access", "Allow Trust → Untrust web-browsing, ssl, and dns. Deny all other applications and finish with an explicit any/any/any deny rule.", [...outbound, ...["ssh", "ftp", "smtp", "rdp", "bittorrent", "unknown-tcp"].map(app => traffic("Trust", "Untrust", app, "deny")), denyBottom]),
  exercise("pan-sec-02", "DMZ Web Server Access", "Allow Untrust → DMZ ssl and Trust → DMZ web-browsing + ssl. DMZ must not initiate traffic to Trust.", dmz),
  exercise("pan-sec-03", "App-ID Enforcement", "Explicitly deny bittorrent and rdp across all zones before allow rules. Allow Trust → Untrust web-browsing and ssl.", [...risky, blockBeforeAllow, ...outbound.slice(0, 2)]),
  exercise("pan-sec-04", "Approved Application Whitelist", "Trust → Untrust may use only web-browsing, ssl, dns, and smtp. Deny ssh, ftp, rdp, bittorrent, and unknown-tcp.", [...outbound, traffic("Trust", "Untrust", "smtp", "allow"), ...["ssh", "ftp", "rdp", "bittorrent", "unknown-tcp"].map(app => traffic("Trust", "Untrust", app, "deny"))]),
  exercise("pan-sec-05", "Inter-Zone Trust Hierarchy", "Allow Management → Trust/DMZ ssh; Trust → DMZ web-browsing + ssl; Untrust → DMZ ssl only. Isolate Trust/DMZ from Management, DMZ from Trust, and Untrust from Trust/Management.", hierarchy),
  exercise("pan-sec-final", "Security Policy Final", "Combine the outbound and DMZ exercises with Management SSH access and zone isolation. Explicitly block bittorrent and rdp before allow rules; end with any/any/any deny.", [...outbound, ...hierarchy, ...risky, blockBeforeAllow, denyBottom]),
];

const zone = (name: string, type: PanZone["type"], iface: string, profile?: PanZone["profile"], logging = false): Check<PanZone> => ({
  desc: `${name}: interface, type, and protection settings`,
  fn: entries => entries.some(entry => entry.name === name && entry.type === type && entry.interfaces.includes(iface) && (!profile || entry.profile === profile) && (!logging || entry.logForwarding)),
});
const basicZones = [zone("Trust", "layer3", "ethernet1/2"), zone("Untrust", "layer3", "ethernet1/1", "strict"), zone("DMZ", "layer3", "ethernet1/3")];
const haZones = [zone("HA", "ha", "ethernet1/6"), zone("HA", "ha", "ethernet1/7")];
const managementZones = [zone("Management", "management", "ethernet1/8", undefined, true)];
const uniqueZones: Check<PanZone> = { desc: "Unique zone names and exclusive interface ownership", fn: entries => {
  const names = entries.map(entry => entry.name.toLowerCase());
  const interfaces = entries.flatMap(entry => entry.interfaces);
  return new Set(names).size === names.length && new Set(interfaces).size === interfaces.length;
} };
export const PAN_ZONE_SCENARIOS = [
  exercise("pan-zone-01", "Basic Zone Setup", "Create Trust (layer3, ethernet1/2), Untrust (layer3, ethernet1/1, strict profile), and DMZ (layer3, ethernet1/3).", [...basicZones, uniqueZones]),
  exercise("pan-zone-02", "HA Zone Configuration", "Assign ethernet1/6 and ethernet1/7 exclusively to HA (type ha).", [...haZones, uniqueZones]),
  exercise("pan-zone-03", "Management Isolation", "Create Management (simulator type management) on ethernet1/8 with log forwarding enabled. Keep interface ownership exclusive.", [...managementZones, uniqueZones]),
  exercise("pan-zone-final", "Zone Design Final", "Combine Trust, Untrust (strict), DMZ, HA on ethernet1/6 + ethernet1/7, and Management with log forwarding on ethernet1/8. Every interface belongs to only one zone.", [...basicZones, ...haZones, ...managementZones, uniqueZones]),
];

const snat: Check<PanNatRule> = { desc: "Coherent outbound source translation", fn: rules => rules.some(rule => rule.type === "source" && rule.srcZone === "Trust" && rule.dstZone === "Untrust" && rule.translated.trim().toLowerCase() === "interface") };
const dnat = (publicIp: string, internalIp: string, service: string): Check<PanNatRule> => ({ desc: `${service}: coherent destination translation`, fn: rules => rules.some(rule => rule.type === "destination" && rule.srcZone === "Untrust" && rule.dstZone === "Untrust" && rule.dstAddr.trim() === publicIp && [internalIp, `${internalIp}:443`].includes(rule.translated.trim())) });
const staticNat = (publicIp: string, internalIp: string): Check<PanNatRule> => ({ desc: "Exact static one-to-one mapping", fn: rules => rules.some(rule => rule.type === "static" && rule.dstAddr.trim() === publicIp && rule.translated.trim() === internalIp) });
export const PAN_NAT_SCENARIOS = [
  exercise("pan-nat-01", "Outbound SNAT", "Create a source NAT rule: Trust → Untrust, translated address 'interface'.", [snat]),
  exercise("pan-nat-02", "Web Server DNAT", "Create destination NAT using pre-NAT Untrust → Untrust zones: original destination 203.0.113.10, translated destination 10.0.1.10 in DMZ (or 10.0.1.10:443). Ports are simplified in this lab.", [dnat("203.0.113.10", "10.0.1.10", "Web server")]),
  exercise("pan-nat-03", "Static NAT", "Create a static mapping with original address 203.0.113.20 and translated address 10.0.1.20.", [staticNat("203.0.113.20", "10.0.1.20")]),
  exercise("pan-nat-final", "NAT Policy Final", "Combine Trust → Untrust source NAT to 'interface', pre-NAT Untrust → Untrust destination NAT 203.0.113.10 → 10.0.1.10 in DMZ, and static NAT 203.0.113.20 → 10.0.1.20.", [snat, dnat("203.0.113.10", "10.0.1.10", "Web server"), staticNat("203.0.113.20", "10.0.1.20")]),
];

export function gradePanExercise(taskId: string, config: unknown) {
  if (!Array.isArray(config) || config.length > 100 || config.some(entry => !entry || typeof entry !== "object")) throw new Error("Configuration must contain up to 100 objects.");
  const text = (value: unknown): value is string => typeof value === "string" && value.length <= 200;
  const strings = (value: unknown) => Array.isArray(value) && value.length <= 50 && value.every(text);
  let checks: { desc: string; fn: (config: any[]) => boolean }[] | undefined;
  if (taskId.startsWith("pan-sec-")) {
    if (config.some(entry => !text(entry.srcZone) || !text(entry.dstZone) || !strings(entry.apps) || !["allow", "deny"].includes(entry.action))) throw new Error("Invalid security policy configuration.");
    checks = PAN_SECURITY_SCENARIOS.find(scenario => scenario.id === taskId)?.checks;
  } else if (taskId.startsWith("pan-zone-")) {
    if (config.some(entry => !text(entry.name) || !strings(entry.interfaces) || !["layer3", "layer2", "tap", "ha", "management"].includes(entry.type) || !["none", "default", "strict"].includes(entry.profile) || typeof entry.logForwarding !== "boolean")) throw new Error("Invalid zone configuration.");
    checks = PAN_ZONE_SCENARIOS.find(scenario => scenario.id === taskId)?.checks;
  } else if (taskId.startsWith("pan-nat-")) {
    if (config.some(entry => !["source", "destination", "static"].includes(entry.type) || ![entry.srcZone, entry.dstZone, entry.dstAddr, entry.translated].every(text))) throw new Error("Invalid NAT configuration.");
    checks = PAN_NAT_SCENARIOS.find(scenario => scenario.id === taskId)?.checks;
  }
  if (!checks) throw new Error("Unknown PAN exercise.");
  const results = checks.map(check => ({ desc: check.desc, pass: check.fn(config) }));
  return { results, overallPassed: results.every(result => result.pass) };
}
