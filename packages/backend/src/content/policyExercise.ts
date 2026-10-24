import { gradeSubmission, ipToInt, parseCidr, parseIpRange, portMatchesServiceValue, type PolicyExercise, type Scenario } from "@fortisim/engine";
import { parseStudentSubmission } from "../validation";
export function validatePolicyExercise(value: unknown, publishing: boolean, checkReference = true): PolicyExercise {
  if (!value || typeof value !== "object") throw new Error("Add a valid policy exercise.");
  const exercise = value as PolicyExercise;
  if (exercise.schemaVersion !== 1 || !Array.isArray(exercise.testPackets) || exercise.testPackets.length > 100 || !Array.isArray(exercise.expectedOutcomes) || exercise.expectedOutcomes.length > 100) throw new Error("Invalid policy exercise format.");
  for (const policies of [exercise.starterPolicies, exercise.referencePolicies]) {
    parseStudentSubmission({ scenarioId: "author-preview", addresses: exercise.starterAddresses, services: exercise.starterServices, policies, webFilterProfiles: exercise.starterWebFilterProfiles });
  }
  const ids = new Set<string>();
  for (const packet of exercise.testPackets) {
    if (!packet || typeof packet.id !== "string" || !packet.id || ids.has(packet.id) || !["WAN", "LAN", "DMZ"].includes(packet.srcIntf) || !["WAN", "LAN", "DMZ"].includes(packet.dstIntf) || !["TCP", "UDP", "ICMP"].includes(packet.protocol) || typeof packet.description !== "string" || packet.description.length > 1000 || typeof packet.srcIp !== "string" || typeof packet.dstIp !== "string" || (packet.domain !== undefined && (typeof packet.domain !== "string" || packet.domain.length > 253))) throw new Error("Every test packet needs valid fields and a unique ID.");
    ids.add(packet.id);
  }
  if (exercise.expectedOutcomes.some(outcome => !outcome || !ids.has(outcome.testPacketId) || !["ACCEPT", "DENY"].includes(outcome.expectedAction) || outcome.expectedLog !== undefined && typeof outcome.expectedLog !== "boolean") || new Set(exercise.expectedOutcomes.map(outcome => outcome.testPacketId)).size !== exercise.expectedOutcomes.length) throw new Error("Invalid or duplicate expected outcomes.");
  if (publishing) {
    if (exercise.testPackets.length < 2 || exercise.testPackets.length !== exercise.expectedOutcomes.length || !["ACCEPT", "DENY"].every(action => exercise.expectedOutcomes.some(outcome => outcome.expectedAction === action))) throw new Error("Include at least one allowed and one denied packet, each with an expected outcome.");
    for (const address of exercise.starterAddresses) {
      if (!address.name.trim()) throw new Error("Give every address object a name.");
      if (!["all", "any"].includes(address.value.trim().toLowerCase())) address.type === "subnet" ? parseCidr(address.value) : parseIpRange(address.value);
    }
    for (const service of exercise.starterServices) {
      if (!service.name.trim()) throw new Error("Give every service object a name.");
      if (service.port) portMatchesServiceValue(0, service.port);
    }
    for (const packet of exercise.testPackets) {
      ipToInt(packet.srcIp); ipToInt(packet.dstIp);
      if (packet.protocol !== "ICMP" && (!Number.isInteger(packet.port) || packet.port! < 0 || packet.port! > 65535)) throw new Error("TCP/UDP test packets require a valid port.");
    }
    for (const policy of [...exercise.starterPolicies, ...exercise.referencePolicies]) {
      if (!policy.name.trim()) throw new Error("Give every policy a name.");
      if (policy.srcAddrIds.some(id => !exercise.starterAddresses.some(a => a.id === id)) || policy.dstAddrIds.some(id => !exercise.starterAddresses.some(a => a.id === id)) || policy.serviceIds.some(id => !exercise.starterServices.some(s => s.id === id)) || policy.webFilterProfileId && !exercise.starterWebFilterProfiles.some(p => p.id === policy.webFilterProfileId)) throw new Error("A policy references a missing address, service, or filter profile.");
    }
    const report = testPolicyExercise(exercise);
    if (checkReference && !report.overallPassed) throw new Error("The reference solution does not pass every packet check. Test and correct it before publishing.");
  }
  return JSON.parse(JSON.stringify(exercise));
}
export function policyScenario(id: string, title: string, description: string, exercise: PolicyExercise): Scenario {
  return { id, title, description, starterAddresses: exercise.starterAddresses, starterServices: exercise.starterServices, starterWebFilterProfiles: exercise.starterWebFilterProfiles, testPackets: exercise.testPackets, expectedOutcomes: exercise.expectedOutcomes };
}
export function testPolicyExercise(exercise: PolicyExercise) {
  return gradeSubmission(policyScenario("author-preview", "Preview", "", exercise), { scenarioId: "author-preview", addresses: exercise.starterAddresses, services: exercise.starterServices, webFilterProfiles: exercise.starterWebFilterProfiles, policies: exercise.referencePolicies });
}
