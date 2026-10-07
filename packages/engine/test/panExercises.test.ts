import { describe, it, expect } from "vitest";
import { evaluatePanPacket, gradePanExercise, PAN_SECURITY_SCENARIOS, PAN_ZONE_SCENARIOS, PAN_NAT_SCENARIOS, type PanSecurityRule, type PanZone, type PanNatRule } from "../src/panExercises";

const rule = (srcZone: string, dstZone: string, apps: string[], action: "allow" | "deny" = "allow"): PanSecurityRule => ({ id: 1, name: "Rule", srcZone, dstZone, apps, action });
const security = [
  rule("any", "any", ["rdp", "bittorrent"], "deny"),
  rule("Management", "Trust", ["ssh"]), rule("Management", "DMZ", ["ssh"]),
  rule("Trust", "Untrust", ["web-browsing", "ssl", "dns"]),
  rule("Trust", "DMZ", ["web-browsing", "ssl"]), rule("Untrust", "DMZ", ["ssl"]),
  rule("any", "any", ["any"], "deny"),
];
const zone = (name: string, type: PanZone["type"], interfaces: string[], profile: PanZone["profile"] = "none", logForwarding = false): PanZone => ({ id: 1, name, type, interfaces, profile, logForwarding });
const zones = [zone("Trust", "layer3", ["ethernet1/2"]), zone("Untrust", "layer3", ["ethernet1/1"], "strict"), zone("DMZ", "layer3", ["ethernet1/3"]), zone("HA", "ha", ["ethernet1/6", "ethernet1/7"]), zone("Management", "management", ["ethernet1/8"], "none", true)];
const nat: PanNatRule[] = [
  { id: 1, name: "SNAT", type: "source", srcZone: "Trust", dstZone: "Untrust", dstAddr: "any", translated: "interface" },
  { id: 2, name: "DNAT", type: "destination", srcZone: "Untrust", dstZone: "Untrust", dstAddr: "203.0.113.10", translated: "10.0.1.10" },
  { id: 3, name: "Static", type: "static", srcZone: "any", dstZone: "any", dstAddr: "203.0.113.20", translated: "10.0.1.20" },
];
describe("PAN exercise grading", () => {
  it("evaluates effective traffic in first-match order", () => {
    expect(evaluatePanPacket([rule("any", "any", ["any"], "deny"), ...security], "Trust", "Untrust", "ssl")).toBe("deny");
    expect(evaluatePanPacket([], "Trust", "Untrust", "ssl")).toBe("deny");
    expect(evaluatePanPacket(security, "Trust", "Untrust", "ssl")).toBe("allow");
  });
  it.each(PAN_SECURITY_SCENARIOS.map(scenario => scenario.id))("has a satisfiable security exercise %s", id => {
    const config = id === "pan-sec-04" ? [rule("Trust", "Untrust", ["web-browsing", "ssl", "dns", "smtp"])] : security;
    expect(gradePanExercise(id, config).overallPassed).toBe(true);
  });
  it("rejects ineffective policies and incorrectly ordered block rules", () => {
    expect(gradePanExercise("pan-sec-01", [rule("any", "any", ["any"], "deny"), ...security]).overallPassed).toBe(false);
    expect(gradePanExercise("pan-sec-03", [security[3], security[0]]).overallPassed).toBe(false);
    expect(gradePanExercise("pan-sec-02", [rule("Untrust", "DMZ", ["ssl"]), rule("Trust", "DMZ", ["web-browsing"])]).overallPassed).toBe(false);
  });
  it.each(PAN_ZONE_SCENARIOS.map(scenario => scenario.id))("has a satisfiable zone exercise %s", id => expect(gradePanExercise(id, zones).overallPassed).toBe(true));
  it("rejects missing DMZ ownership and shared interfaces", () => {
    expect(gradePanExercise("pan-zone-01", zones.filter(entry => entry.name !== "DMZ")).overallPassed).toBe(false);
    expect(gradePanExercise("pan-zone-final", [...zones, zone("Other", "layer3", ["ethernet1/1"])]).overallPassed).toBe(false);
  });
  it.each(PAN_NAT_SCENARIOS.map(scenario => scenario.id))("has a satisfiable NAT exercise %s", id => expect(gradePanExercise(id, nat).overallPassed).toBe(true));
  it("does not accept substring addresses or unrelated rules combining into a pass", () => {
    expect(gradePanExercise("pan-nat-03", [{ ...nat[2], dstAddr: "203.0.113.200", translated: "10.0.1.200" }]).overallPassed).toBe(false);
    expect(gradePanExercise("pan-nat-02", [{ ...nat[1], translated: "bad" }, { ...nat[1], dstAddr: "bad" }]).overallPassed).toBe(false);
    expect(gradePanExercise("pan-nat-02", [{ ...nat[1], dstZone: "DMZ" }]).overallPassed).toBe(false);
  });
  it("bounds and validates configurations before evaluating", () => {
    expect(() => gradePanExercise("pan-sec-01", [{}])).toThrow(/Invalid/);
    expect(() => gradePanExercise("pan-sec-01", Array(101).fill(security[0]))).toThrow(/100/);
    expect(() => gradePanExercise("unknown", [])).toThrow(/Unknown/);
  });
});
