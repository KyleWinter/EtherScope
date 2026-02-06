import { CallNode } from "../trace/types.js";
import { Finding, Rule, RuleContext } from "./types.js";

export type VulnEngineOptions = {
  rules: Rule[];
};

export class VulnEngine {
  constructor(private opts: VulnEngineOptions) {}

  run(root: CallNode, flat: CallNode[], helpers?: Pick<RuleContext, "selectorOf" | "signatureOf">): Finding[] {
    const ctx: RuleContext = { root, flat, ...helpers };
    const all: Finding[] = [];
    for (const r of this.opts.rules) {
      try {
        all.push(...r.run(ctx));
      } catch (e) {
        all.push({
          id: `engine_error_${r.id}`,
          ruleId: r.id,
          title: `Rule failed: ${r.title}`,
          severity: "LOW",
          confidence: 0.2,
          description: `Rule threw error: ${String(e)}`,
          evidence: []
        });
      }
    }
    return dedupeFindings(all);
  }
}

function dedupeFindings(fs: Finding[]): Finding[] {
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const f of fs) {
    const k = `${f.ruleId}:${f.title}:${f.evidence.map((e) => e.callPath.join(">")).join("|")}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(f);
  }
  return out;
}
