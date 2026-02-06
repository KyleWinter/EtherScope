import { describe, it, expect } from "vitest";
import { buildExplanations } from "../../src/report/explain.js";

describe("report explanations", () => {
  it("builds callId -> signature mapping and human strings", () => {
    const trace: any = {
      root: { id: "c0" },
      flat: [
        { id: "c0", type: "CALL", from: "0xaaaa", to: "0xbbbb", input: "0xa9059cbb00000000", depth: 0 },
        { id: "c1", type: "CALL", from: "0xbbbb", to: "0xtoken", input: "0x23b872dd00000000", depth: 1 }
      ]
    };

    const transfers: any[] = [
      { token: "0xToken", from: "0xaaaa", to: "0xbbbb", value: 7n, callId: "c1" }
    ];

    const ex = buildExplanations(trace, transfers);
    expect(ex.callsById["c1"]).toBeTruthy();
    expect(ex.transfers[0].human.includes("Transfer")).toBe(true);
    expect(ex.transfers[0].callId).toBe("c1");
  });
});
