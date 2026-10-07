import { describe, it, expect } from "vitest";
import { PORTS, CABLE_TYPES, acceptsCable } from "../../frontend/src/hardware/cables";

describe("cable practice mapping", () => {
  it("covers all 13 sockets exactly once", () => {
    expect(PORTS).toHaveLength(13);
    expect(new Set(PORTS.map(port => port.id)).size).toBe(13);
    expect(PORTS.every(port => port.x > -0.5 && port.x < 0.5)).toBe(true);
    expect(PORTS.every((port, index) => index === 0 || port.x > PORTS[index - 1].x)).toBe(true);
  });
  it("allows only the intended cable for each socket", () => {
    for (const port of PORTS) {
      const accepted = CABLE_TYPES.filter(cable => acceptsCable(cable.id, port.id));
      expect(accepted).toHaveLength(1);
      expect(accepted[0].accepts).toContain(port.part);
    }
    expect(acceptsCable("rj45-ha", "lan-5")).toBe(false);
    expect(acceptsCable("rj45-lan", "ha-a")).toBe(false);
    expect(acceptsCable("usb", "console")).toBe(false);
    expect(acceptsCable("unknown", "power")).toBe(false);
    expect(acceptsCable("dc-power", "unknown")).toBe(false);
  });
});
