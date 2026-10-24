// Generated from engine/src/drafts.ts by scripts/sync-academy-contract.mjs.
import { LESSONS } from "./lesson-manifest.mjs";
const isCompletionTask = (platform, id) => Object.prototype.hasOwnProperty.call(LESSONS, platform) && LESSONS[platform].includes(id);
export function builtinDraftSpec(platform, id) {
    if (!isCompletionTask(platform, id))
        return null;
    if (platform === "fortigate")
        return { kind: id.startsWith("interface-") ? "interfaces" : id.startsWith("port-") ? "ports" : id.startsWith("routing-") ? "routing" : "policy", scenarioVersion: "1" };
    return { kind: id.startsWith("pan-sec-") ? "pan-security" : id.startsWith("pan-zone-") ? "pan-zones" : id.startsWith("pan-nat-") ? "pan-nat" : id.startsWith("pan-iface-") ? "pan-interfaces" : "pan-ports", scenarioVersion: "1" };
}
export function isSimulatorConfiguration(kind, value) {
    const record = (v) => v && typeof v === "object" && !Array.isArray(v);
    const text = (v) => typeof v === "string" && v.length <= 2000;
    const strings = (v) => Array.isArray(v) && v.length <= 200 && v.every(text);
    const array = (v, check) => Array.isArray(v) && v.length <= 200 && v.every(entry => record(entry) && check(entry));
    if (JSON.stringify(value)?.length > 100000)
        return false;
    const config = value;
    switch (kind) {
        case "policy": return record(config) && array(config.addresses, a => text(a.id) && text(a.name) && ["subnet", "range"].includes(a.type) && text(a.value)) &&
            array(config.services, s => text(s.id) && text(s.name) && ["TCP", "UDP", "ICMP"].includes(s.protocol) && (s.port === undefined || text(s.port))) &&
            array(config.policies, p => text(p.id) && text(p.name) && text(p.srcIntf) && text(p.dstIntf) && strings(p.srcAddrIds) && strings(p.dstAddrIds) && strings(p.serviceIds) && ["ACCEPT", "DENY"].includes(p.action) && typeof p.enabled === "boolean" && typeof p.log === "boolean") &&
            array(config.webFilterProfiles, p => text(p.id) && text(p.name) && strings(p.blockedDomains));
        case "interfaces": return array(config, i => text(i.name) && text(i.role) && text(i.ip) && text(i.subnet) && strings(i.adminAccess));
        case "ports": return array(config, p => text(p.portId) && text(p.zone));
        case "routing": return array(config, r => text(r.id) && text(r.destination) && text(r.gateway) && text(r.interfaceName) && typeof r.distance === "number" && Number.isFinite(r.distance));
        case "pan-security": return array(config, r => Number.isSafeInteger(r.id) && text(r.name) && text(r.srcZone) && text(r.dstZone) && strings(r.apps) && ["allow", "deny"].includes(r.action));
        case "pan-zones": return array(config, z => Number.isSafeInteger(z.id) && text(z.name) && text(z.type) && text(z.profile) && strings(z.interfaces) && typeof z.logForwarding === "boolean");
        case "pan-nat": return array(config, r => Number.isSafeInteger(r.id) && text(r.name) && text(r.type) && text(r.srcZone) && text(r.dstZone) && text(r.dstAddr) && text(r.translated));
        case "pan-interfaces": return array(config, i => text(i.id) && text(i.type) && text(i.zone) && text(i.ip) && typeof i.link === "boolean" && text(i.speed) && text(i.comment));
        case "pan-ports": return array(config, p => text(p.id) && text(p.zone) && text(p.label));
    }
}
