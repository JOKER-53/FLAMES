import { describe, expect, it } from "vitest";
import { evaluatePacket } from "./evaluator";
import type { FirewallPolicy, TestPacket } from "./types";

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
