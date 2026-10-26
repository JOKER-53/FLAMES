import { describe, expect, it } from "vitest";
import { evaluatePacket } from "../src/policy/evaluator";
import type { FirewallPolicy, TestPacket } from "../src/policy/types";

const packet: TestPacket = { id: "p", description: "test", srcIntf: "LAN", dstIntf: "WAN", srcIp: "10.0.0.1", dstIp: "1.1.1.1", protocol: "TCP", port: 443 };
const policy: FirewallPolicy = { id: "rule", name: "rule", srcIntf: "LAN", dstIntf: "WAN", srcAddrIds: ["missing"], dstAddrIds: [], serviceIds: [], action: "ACCEPT", log: false, enabled: true };

describe("evaluatePacket reference handling", () => {
  it("does not turn an unknown object reference into a wildcard", () => {
    expect(evaluatePacket(packet, [policy], [], []).finalAction).toBe("DENY");
  });

  it("does not match a port-specific service when the packet has no port", () => {
    const noPort = { ...packet, port: undefined };
    const validPolicy = { ...policy, srcAddrIds: [], serviceIds: ["https"] };
    const services = [{ id: "https", name: "HTTPS", protocol: "TCP" as const, port: "443" }];
    expect(evaluatePacket(noPort, [validPolicy], [], services).finalAction).toBe("DENY");
  });
});

describe("web filter domain normalization", () => {
  const allow = { ...policy, srcAddrIds: [], webFilterProfileId: "filter" };
  const profiles = [{ id: "filter", name: "Filter", blockedDomains: [" Blocked.Example. "] }];
  it("blocks mixed case, trailing dots, and subdomains", () => {
    for (const domain of ["blocked.example", "BLOCKED.EXAMPLE.", "www.Blocked.Example"]) {
      expect(evaluatePacket({ ...packet, domain }, [allow], [], [], profiles).finalAction).toBe("DENY");
    }
  });
  it("does not block a different domain with the same suffix text", () => {
    expect(evaluatePacket({ ...packet, domain: "notblocked.example" }, [allow], [], [], profiles).finalAction).toBe("ACCEPT");
  });
});

it("does not silently accept traffic when its web filter profile is missing", () => {
  expect(evaluatePacket({ ...packet, domain: 'blocked.example' }, [{ ...policy, srcAddrIds: [], webFilterProfileId: 'deleted' }], [], []).finalAction).toBe('DENY');
});
