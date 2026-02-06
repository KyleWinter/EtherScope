import { Rule, Finding } from "../types.js";

export const uncheckedCallRule: Rule = {
  id: "unchecked_call",
  title: "Unchecked low-level call",
  run(ctx) {
    const out: Finding[] = [];

    for (const c of ctx.flat) {
      // 子节点报错，但父节点没 error（很多 tracer 会在父节点体现 error；这里只做启发式）
      if (!c.error) continue;

      const isLowLevel = c.type === "CALL" || c.type === "DELEGATECALL" || c.type === "STATICCALL";
      if (!isLowLevel) continue;

      out.push({
        id: `unchecked_${c.id}`,
        ruleId: "unchecked_call",
        title: "Low-level call reverted",
        severity: "MEDIUM",
        confidence: 0.55,
        description:
          "A low-level call reverted. Check if the caller validates return value / bubbles revert properly (especially for call{value:...}()).",
        evidence: [{ title: "Reverted call", callPath: [c.id], notes: [c.error] }]
      });
    }

    return out;
  }
};
