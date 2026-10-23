import { describe, it, expect } from "vitest";
import { PORTS, CABLE_TYPES, EXERCISE_SOCKETS, acceptsCable } from "../src/hardware/cables";
import { ALL_PORT_SCENARIOS } from "../../engine/src/portScenarios";
import { portFinalScenario } from "../../engine/src/finalAssignments";

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
  it("maps exercise ports to distinct RJ-45 data sockets", () => {
    const sockets = Object.values(EXERCISE_SOCKETS);
    expect(new Set(sockets).size).toBe(sockets.length);
    for (const id of sockets) {
      const port = PORTS.find(p => p.id === id);
      expect(port, id).toBeDefined();
      expect(["power", "usb", "console"]).not.toContain(port!.part);
    }
    // Same-numbered LAN sockets keep the model labels consistent with the exercise.
    for (let n = 1; n <= 5; n++) expect(EXERCISE_SOCKETS[`port${n}`]).toBe(`lan-${n}`);
  });
  it("gives every WAN and port1-8 in the port exercises a socket", () => {
    for (const scenario of [...ALL_PORT_SCENARIOS, portFinalScenario]) {
      for (const { portId } of scenario.ports) {
        const n = Number(portId.replace("port", ""));
        if (portId.startsWith("wan") || n <= 8) expect(EXERCISE_SOCKETS[portId], `${scenario.id}/${portId}`).toBeDefined();
      }
    }
  });
});
