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
    if (!policy.enabled) continue;

    const srcIntfMatch = policy.srcIntf === packet.srcIntf;
    const dstIntfMatch = policy.dstIntf === packet.dstIntf;

    if (!srcIntfMatch || !dstIntfMatch) {
      trace.push({ policyId: policy.id, policyName: policy.name, matched: false, reason: `Interface mismatch (${packet.srcIntf}→${packet.dstIntf} vs ${policy.srcIntf}→${policy.dstIntf})` });
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

    if (!srcMatch || !dstMatch || !svcMatch) {
      trace.push({ policyId: policy.id, policyName: policy.name, matched: false, reason: !srcMatch ? "Source address no match" : !dstMatch ? "Destination address no match" : "Service no match" });
      continue;
    }

    if (policy.action === "ACCEPT" && policy.webFilterProfileId && packet.domain) {
      const profile = webFilterProfiles.find((p) => p.id === policy.webFilterProfileId);
      if (profile) {
        const blocked = profile.blockedDomains.some(
          (d) => packet.domain === d || packet.domain!.endsWith(`.${d}`)
        );
        if (blocked) {
          trace.push({ policyId: policy.id, policyName: policy.name, matched: true, reason: `Policy matched but domain "${packet.domain}" blocked by Web Filter profile "${profile.name}"` });
          return { finalAction: "DENY", matchedPolicyId: policy.id, webFiltered: true, trace };
        }
      }
    }

    trace.push({ policyId: policy.id, policyName: policy.name, matched: true, reason: `Matched — ${policy.action}` });
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
