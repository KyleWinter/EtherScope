import { describe, it, expect } from "vitest";
import { VulnEngine } from "../src/vuln/engine.js";
import { reentrancyRule } from "../src/vuln/rules/reentrancyRule.js";
import { CallNode } from "../src/trace/types.js";

describe("vulnEngine", () => {
  it("runs rules", () => {
    const root: CallNode = {
      id: "c0",
      type: "CALL",
      from: "0x1" as any,
      to: "0xA" as any,
      depth: 0,
      children: [
        {
          id: "c1",
          type: "CALL",
          from: "0xA" as any,
          to: "0xB" as any,
          depth: 1,
          parentId: "c0",
          children: [
            {
              id: "c2",
              type: "CALL",
              from: "0xB" as any,
              to: "0xA" as any,
              depth: 2,
              parentId: "c1",
              children: []
            }
          ]
        }
      ]
    };
    const flat = [root, ...root.children, ...root.children[0].children];
    const engine = new VulnEngine({ rules: [reentrancyRule] });
    const findings = engine.run(root, flat);
    expect(findings.length).toBeGreaterThan(0);
  });
});
