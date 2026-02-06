import { Rule, Finding } from "../types.js";
import { buildCallPath } from "../evidence.js";
import { CallNode } from "../../trace/types.js";

export const reentrancyRule: Rule = {
  id: "reentrancy",
  title: "Potential reentrancy pattern",
  run(ctx) {
    const byId = new Map(ctx.flat.map((c) => [c.id, c]));
    const findings: Finding[] = [];

    // 对每个节点，检查它是否“回到了”某个祖先的 to 地址
    for (const n of ctx.flat) {
      if (!n.to) continue;
      const loop = findAncestorWithSameTo(byId, n);
      if (!loop) continue;

      // 中间必须出现一次外部 CALL（to != ancestor.to）
      if (!hasExternalHop(byId, loop.ancestorId, n.id)) continue;

      findings.push({
        id: `reentrancy_${loop.ancestorId}_${n.id}`,
        ruleId: "reentrancy",
        title: "Possible reentrancy (same contract re-entered)",
        severity: "HIGH",
        confidence: 0.65,
        description:
          "Call stack shows the same target contract being entered again after an external call. Validate with state-change-before-external-call pattern.",
        evidence: [
          {
            title: "Re-entered call path",
            callPath: buildCallPath(byId, n.id),
            notes: [`ancestor=${loop.ancestorId}`, `reentered=${n.id}`]
          }
        ]
      });
    }

    return findings;
  }
};

function findAncestorWithSameTo(byId: Map<string, CallNode>, n: CallNode): { ancestorId: string } | undefined {
  let cur = n.parentId ? byId.get(n.parentId) : undefined;
  while (cur) {
    if (cur.to && n.to && cur.to.toLowerCase() === n.to.toLowerCase()) return { ancestorId: cur.id };
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return undefined;
}

function hasExternalHop(byId: Map<string, CallNode>, ancestorId: string, leafId: string): boolean {
  const path = buildPathNodes(byId, leafId);
  const idx = path.findIndex((x) => x.id === ancestorId);
  if (idx < 0) return false;

  const target = path[idx].to?.toLowerCase();
  for (let i = idx + 1; i < path.length; i++) {
    const t = path[i].to?.toLowerCase();
    if (t && target && t !== target) return true;
  }
  return false;
}

function buildPathNodes(byId: Map<string, CallNode>, leafId: string): CallNode[] {
  const out: CallNode[] = [];
  let cur: CallNode | undefined = byId.get(leafId);
  while (cur) {
    out.push(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  out.reverse();
  return out;
}
