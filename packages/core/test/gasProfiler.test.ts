import { describe, it, expect } from "vitest";
import { profileGas } from "../src/gas/gasProfiler.js";
import { CallNode } from "../src/trace/types.js";

describe("gasProfiler", () => {
  it("computes selfGasUsed", () => {
    const root: CallNode = {
      id: "c0",
      type: "CALL",
      from: "0x1" as any,
      to: "0x2" as any,
      depth: 0,
      children: [
        { id: "c1", type: "CALL", from: "0x2" as any, to: "0x3" as any, depth: 1, parentId: "c0", children: [], gasUsed: 40n }
      ],
      gasUsed: 100n
    };
    const p = profileGas(root);
    const r0 = p.byCall.find((x) => x.callId === "c0")!;
    expect(r0.selfGasUsed).toBe(60n);
  });
});
