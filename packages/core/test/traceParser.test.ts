import { describe, it, expect } from "vitest";
import { parseTraceToCallTree } from "../src/trace/traceParser.js";

describe("traceParser", () => {
  it("builds call tree from normalized trace", () => {
    const tr: any = {
      type: "CALL",
      from: "0x1111111111111111111111111111111111111111",
      to: "0x2222222222222222222222222222222222222222",
      gasUsed: "21000",
      calls: [
        {
          type: "CALL",
          from: "0x2222222222222222222222222222222222222222",
          to: "0x3333333333333333333333333333333333333333",
          gasUsed: "1000"
        }
      ]
    };
    const res = parseTraceToCallTree(tr);
    expect(res.flat.length).toBe(2);
    expect(res.root.children.length).toBe(1);
  });
});
