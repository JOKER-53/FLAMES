import { describe, it, expect } from "vitest";
import { PAN_SOCKETS, PAN_CABLE_TYPES, panAcceptsCable } from "../../frontend/src/hardware/panCables";

describe("PA-220 cable practice mapping", () => {
  it("covers every front and rear socket exactly once", () => {
    expect(PAN_SOCKETS).toHaveLength(14);
    expect(new Set(PAN_SOCKETS.map(s => s.id)).size).toBe(14);
    expect(new Set(PAN_SOCKETS.map(s => s.node)).size).toBe(14);
  });
  it("accepts exactly one cable type per socket", () => {
    for (const socket of PAN_SOCKETS) {
      expect(PAN_CABLE_TYPES.filter(c => panAcceptsCable(c.id, socket.id)), socket.id).toHaveLength(1);
    }
    expect(panAcceptsCable("pan-data", "management")).toBe(false);
    expect(panAcceptsCable("pan-mgmt", "ethernet1/1")).toBe(false);
    expect(panAcceptsCable("pan-console", "micro-console")).toBe(false);
    expect(panAcceptsCable("pan-power", "pwr2")).toBe(true);
    expect(panAcceptsCable("unknown", "usb")).toBe(false);
  });
});
