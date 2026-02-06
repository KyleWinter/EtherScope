import { CallNode } from "../trace/types.js";
import { BalanceChange } from "./types.js";

/**
 * ⚠️ 重要说明
 * 这是基于 trace CALL value 的“估算版 ETH 余额变化”。
 *
 * 真实精确余额变化应该：
 * - 优先使用 stateDiff（如果节点支持）
 * - 或 receipt + internal tx + suicide/refund 组合
 *
 * 当前用途：
 * - 攻击路径分析
 * - 快速资金流方向判断
 * - 证据链辅助
 */

function normalizeAddr(addr?: string): string | undefined {
  if (!addr) return undefined;
  return addr.toLowerCase();
}

function parseValue(v: unknown): bigint {
  if (!v) return 0n;

  if (typeof v === "bigint") return v;
  if (typeof v === "number") return BigInt(v);

  if (typeof v === "string") {
    try {
      // hex
      if (v.startsWith("0x")) return BigInt(v);
      // decimal
      if (/^\d+$/.test(v)) return BigInt(v);
    } catch {}
  }

  return 0n;
}

export function estimateEthBalanceChanges(root: CallNode): BalanceChange[] {
  const map = new Map<string, bigint>();

  const add = (addr: string, delta: bigint) => {
    if (!addr) return;
    if (delta === 0n) return;
    map.set(addr, (map.get(addr) ?? 0n) + delta);
  };

  const walk = (n: CallNode) => {
    const from = normalizeAddr(n.from);
    const to = normalizeAddr(n.to);

    const value = parseValue(n.value);

    // 跳过 0 value
    if (value > 0n && from && to && from !== to) {
      // ⚠️ 如果 call 最终 revert，理论上 value 不应计入
      // 但 trace 不同节点行为不同：
      // 有的仍保留 value，有的已经 rollback
      // 这里我们选择：
      //   ❌ 跳过明确 error 的 call
      if (!n.error) {
        add(from, -value);
        add(to, value);
      }
    }

    for (const c of n.children) walk(c);
  };

  walk(root);

  // 过滤掉 0 余额变化 + 排序稳定输出（非常重要，方便 diff report）
  return [...map.entries()]
    .filter(([, delta]) => delta !== 0n)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([address, deltaWei]) => ({
      address,
      deltaWei
    }));
}
