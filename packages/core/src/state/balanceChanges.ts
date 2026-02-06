import { CallNode } from "../trace/types.js";
import { BalanceChange } from "./types.js";

export function estimateEthBalanceChanges(root: CallNode): BalanceChange[] {
  // 注意：这只是“粗略估计”，真实 ETH 变化要用 stateDiff / tx receipt + internal transfers
  const map = new Map<string, bigint>();

  const add = (addr: string, delta: bigint) => map.set(addr, (map.get(addr) ?? 0n) + delta);

  const walk = (n: CallNode) => {
    const v = n.value ? BigInt(n.value) : 0n;
    if (v > 0n && n.to) {
      add(n.from, -v);
      add(n.to, v);
    }
    n.children.forEach(walk);
  };

  walk(root);

  return [...map.entries()].map(([address, deltaWei]) => ({ address, deltaWei }));
}
