import { Rule, Finding } from "../types.js";

const SENSITIVE_KEYWORDS = ["upgrade", "setOwner", "transferOwnership", "initialize", "setAdmin", "mint"];

export const accessControlRule: Rule = {
  id: "access_control",
  title: "Suspicious access-control pattern",
  run(ctx) {
    const out: Finding[] = [];

    for (const c of ctx.flat) {
      const sig = ctx.signatureOf?.(c) ?? "";
      if (!sig) continue;

      const hit = SENSITIVE_KEYWORDS.some((k) => sig.toLowerCase().includes(k.toLowerCase()));
      if (!hit) continue;

      out.push({
        id: `ac_${c.id}`,
        ruleId: "access_control",
        title: "Sensitive function observed; verify access control",
        severity: "MEDIUM",
        confidence: 0.5,
        description:
          "Sensitive admin-like function observed in trace. Ensure proper access control (onlyOwner/roles) and initialization protection.",
        evidence: [{ title: "Sensitive call", callPath: [c.id], notes: [sig] }]
      });
    }

    return out;
  }
};
