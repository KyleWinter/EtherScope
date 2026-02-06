import { CallNode } from "../trace/types.js";
import { InteractionGraph } from "./types.js";

export function buildInteractionGraph(
  root: CallNode,
  labelOf?: (c: CallNode) => string | undefined
): InteractionGraph {
  const nodeMap = new Map<string, { id: string; label: string; address?: string; kind: "EOA" | "CONTRACT" }>();
  const edgeMap = new Map<string, { from: string; to: string; count: number; label?: string }>();

  const ensureNode = (addr: string, kind: "EOA" | "CONTRACT") => {
    const id = addr.toLowerCase();
    if (!nodeMap.has(id)) nodeMap.set(id, { id, label: addr, address: addr, kind });
    return id;
  };

  const walk = (n: CallNode) => {
    const fromId = ensureNode(n.from, "EOA"); // 简化：from 可能也是合约，但 UI 上影响不大
    if (n.to) {
      const toId = ensureNode(n.to, "CONTRACT");
      const lbl = labelOf?.(n);
      const key = `${fromId}->${toId}:${lbl ?? ""}`;
      const cur = edgeMap.get(key) ?? { from: fromId, to: toId, count: 0, label: lbl };
      cur.count += 1;
      edgeMap.set(key, cur);
    }
    n.children.forEach(walk);
  };

  walk(root);

  return {
    nodes: [...nodeMap.values()],
    edges: [...edgeMap.entries()].map(([k, e]) => ({
      id: k,
      from: e.from,
      to: e.to,
      label: e.label,
      weight: e.count
    }))
  };
}
