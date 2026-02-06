import { Rule, Finding } from "../types.js";

export const dangerousDelegatecallRule: Rule = {
  id: "dangerous_delegatecall",
  title: "Potentially dangerous delegatecall",
  run(ctx) {
    const out: Finding[] = [];
    for (const c of ctx.flat) {
      if (c.type !== "DELEGATECALL") continue;
      out.push({
        id: `dc_${c.id}`,
        ruleId: "dangerous_delegatecall",
        title: "Delegatecall observed; verify target trust boundary",
        severity: "HIGH",
        confidence: 0.6,
        description:
          "Delegatecall executes callee code in caller storage context. Confirm the target address is trusted/immutable and inputs can't redirect execution.",
        evidence: [{ title: "Delegatecall frame", callPath: [c.id], notes: [String(c.to ?? "unknown")] }]
      });
    }
    return out;
  }
};
