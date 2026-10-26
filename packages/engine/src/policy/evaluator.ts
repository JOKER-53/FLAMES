import {
  FirewallPolicy,
  TestPacket,
  AddressObject,
  ServiceObject,
  WebFilterProfile,
} from "./types";
import { ipMatchesAddressValue, portMatchesServiceValue } from "./matching";

export interface PolicyTraceEntry {
  policyId: string;
  policyName: string;
  matched: boolean;
  reason: string;
  comparisons?: { label: string; matched: boolean; detail: string }[];
  filter?: { profileId: string; profileName: string; domain: string; blocked: boolean };
}

export interface EvaluationResult {
  finalAction: "ACCEPT" | "DENY";
  matchedPolicyId: string | null;
  webFiltered: boolean;
  trace: PolicyTraceEntry[];
}

export function evaluatePacket(
  packet: TestPacket,
  policies: FirewallPolicy[],
  addresses: AddressObject[],
  services: ServiceObject[],
  webFilterProfiles: WebFilterProfile[] = []
): EvaluationResult {
  const trace: PolicyTraceEntry[] = [];

  for (const policy of policies) {
    if (!policy.enabled) { trace.push({ policyId: policy.id, policyName: policy.name, matched: false, reason: "Policy is disabled" }); continue; }

    const srcIntfMatch = policy.srcIntf === packet.srcIntf;
    const dstIntfMatch = policy.dstIntf === packet.dstIntf;

    if (!srcIntfMatch || !dstIntfMatch) {
      trace.push({ policyId: policy.id, policyName: policy.name, matched: false, reason: `Interface mismatch (${packet.srcIntf}→${packet.dstIntf} vs ${policy.srcIntf}→${policy.dstIntf})`, comparisons: [{label:"Incoming interface",matched:srcIntfMatch,detail:`Packet ${packet.srcIntf}; policy ${policy.srcIntf}`},{label:"Outgoing interface",matched:dstIntfMatch,detail:`Packet ${packet.dstIntf}; policy ${policy.dstIntf}`}] });
      continue;
    }

    const srcAddrs = policy.srcAddrIds.map((id) => addresses.find((a) => a.id === id)).filter(Boolean) as AddressObject[];
    const dstAddrs = policy.dstAddrIds.map((id) => addresses.find((a) => a.id === id)).filter(Boolean) as AddressObject[];
    const svcs = policy.serviceIds.map((id) => services.find((s) => s.id === id)).filter(Boolean) as ServiceObject[];

    // A dangling reference is an invalid policy, never an implicit wildcard.
    if (
      srcAddrs.length !== policy.srcAddrIds.length ||
      dstAddrs.length !== policy.dstAddrIds.length ||
      svcs.length !== policy.serviceIds.length
    ) {
      trace.push({ policyId: policy.id, policyName: policy.name, matched: false, reason: "Policy references an unknown address or service object" });
      continue;
    }

    const srcMatch = srcAddrs.length === 0 || srcAddrs.some((a) => ipMatchesAddressValue(packet.srcIp, a.type, a.value));
    const dstMatch = dstAddrs.length === 0 || dstAddrs.some((a) => ipMatchesAddressValue(packet.dstIp, a.type, a.value));
    const svcMatch = svcs.length === 0 || svcs.some((s) =>
      s.protocol === packet.protocol &&
      (!s.port || (packet.port !== undefined && portMatchesServiceValue(packet.port, s.port)))
    );

    const comparisons = [
      {label:"Interfaces",matched:true,detail:`${packet.srcIntf} → ${packet.dstIntf}`},
      {label:"Source address",matched:srcMatch,detail:`${packet.srcIp}; objects: ${srcAddrs.map(a=>`${a.name} (${a.value})`).join(", ")||"any"}`},
      {label:"Destination address",matched:dstMatch,detail:`${packet.dstIp}; objects: ${dstAddrs.map(a=>`${a.name} (${a.value})`).join(", ")||"any"}`},
      {label:"Service",matched:svcMatch,detail:`${packet.protocol}${packet.port===undefined?"":`/${packet.port}`}; services: ${svcs.map(s=>`${s.name} (${s.protocol}${s.port?`/${s.port}`:""})`).join(", ")||"any"}`},
    ];
    let filter: PolicyTraceEntry["filter"];
    if (!srcMatch || !dstMatch || !svcMatch) {
      trace.push({ policyId: policy.id, policyName: policy.name, matched: false, reason: !srcMatch ? "Source address no match" : !dstMatch ? "Destination address no match" : "Service no match", comparisons });
      continue;
    }

    if (policy.webFilterProfileId && !webFilterProfiles.some(profile => profile.id === policy.webFilterProfileId)) {
      trace.push({ policyId: policy.id, policyName: policy.name, matched: false, reason: "Policy references an unknown web filter profile", comparisons });
      continue;
    }

    if (policy.action === "ACCEPT" && policy.webFilterProfileId && packet.domain) {
      const profile = webFilterProfiles.find((p) => p.id === policy.webFilterProfileId);
      if (profile) {
        const normalizeDomain = (domain: string) => domain.trim().toLowerCase().replace(/\.+$/, "");
        const domain = normalizeDomain(packet.domain);
        const blocked = profile.blockedDomains.some(value => {
          const blockedDomain = normalizeDomain(value);
          return !!blockedDomain && (domain === blockedDomain || domain.endsWith(`.${blockedDomain}`));
        });
        filter = { profileId: profile.id, profileName: profile.name, domain: packet.domain, blocked };
        if (blocked) {
          trace.push({ policyId: policy.id, policyName: policy.name, matched: true, reason: `Policy matched but domain "${packet.domain}" blocked by Web Filter profile "${profile.name}"`, comparisons, filter });
          return { finalAction: "DENY", matchedPolicyId: policy.id, webFiltered: true, trace };
        }
      }
    }

    trace.push({ policyId: policy.id, policyName: policy.name, matched: true, reason: `Matched — ${policy.action}`, comparisons, ...(filter ? {filter} : {}) });
    return { finalAction: policy.action, matchedPolicyId: policy.id, webFiltered: false, trace };
  }

  trace.push({ policyId: "implicit-deny", policyName: "Implicit Default Deny", matched: true, reason: "No policy matched — default deny" });
  return { finalAction: "DENY", matchedPolicyId: null, webFiltered: false, trace };
}

export function evaluateAll(
  packets: TestPacket[],
  policies: FirewallPolicy[],
  addresses: AddressObject[],
  services: ServiceObject[],
  webFilterProfiles: WebFilterProfile[] = []
): EvaluationResult[] {
  return packets.map((p) => evaluatePacket(p, policies, addresses, services, webFilterProfiles));
}
