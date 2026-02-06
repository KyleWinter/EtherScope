import { CallNode } from "../../trace/types.js";
import { BalanceDelta, EvidenceRef } from "./types.js";
import { extractErc20TransfersFromReceiptLogs, ReceiptLog } from "./erc20FromLogs.js";

// ---- helpers ----
function normAddr(a?: string): string | undefined {
  if (!a) return undefined;
  return a.toLowerCase();
}

function parseValue(v: any): bigint {
  if (!v) return 0n;
  if (typeof v === "bigint") return v;
  if (typeof v === "number") return BigInt(v);
  if (typeof v === "string") {
    if (v.startsWith("0x")) return BigInt(v);
    if (/^\d+$/.test(v)) return BigInt(v);
  }
  return 0n;
}

type Key = string;
function keyOf(asset: any, address: string): Key {
  return asset.kind === "native"
    ? `native::${address}`
    : `erc20:${asset.token.toLowerCase()}::${address}`;
}

// ---- main ----
export type BalanceAttributionInput = {
  callTreeRoot: CallNode;
  receiptLogs: ReceiptLog[];
  chainId?: number;
};

export type BalanceAttributionOutput = {
  deltas: BalanceDelta[];
};

export function attributeBalances(input: BalanceAttributionInput): BalanceAttributionOutput {
  const { callTreeRoot, receiptLogs, chainId } = input;

  // Map key -> { delta, evidence[] }
  const map = new Map<Key, BalanceDelta>();

  const add = (asset: BalanceDelta["asset"], address: string, delta: bigint, evidence: EvidenceRef) => {
    if (delta === 0n) return;
    const addr = address.toLowerCase();
    const k = keyOf(asset, addr);

    const cur = map.get(k);
    if (!cur) {
      map.set(k, { asset, address: addr, delta, evidence: [evidence] });
    } else {
      cur.delta += delta;
      cur.evidence.push(evidence);
    }
  };

  // A) Native ETH from trace CALL.value
  const walk = (n: CallNode) => {
    const v = parseValue(n.value);
    const from = normAddr(n.from);
    const to = normAddr(n.to);

    // 跳过错误 call（通常 revert 后 value 不生效；不同节点可能仍显示 value，但我们偏保守）
    if (!n.error && v > 0n && from && to && from !== to) {
      const asset = { kind: "native" as const, chainId };
      add(asset, from, -v, { type: "callValue", callId: n.id });
      add(asset, to, v, { type: "callValue", callId: n.id });
    }

    for (const c of n.children) walk(c);
  };
  walk(callTreeRoot);

  // B) ERC20 transfers from receipt logs
  const transfers = extractErc20TransfersFromReceiptLogs(receiptLogs);
  for (const t of transfers) {
    const asset = { kind: "erc20" as const, token: t.token };
    add(asset, t.from, -t.amount, { type: "erc20Transfer", txLogIndex: t.txLogIndex, token: t.token });
    add(asset, t.to, t.amount, { type: "erc20Transfer", txLogIndex: t.txLogIndex, token: t.token });
  }

  // stable output
  const deltas = [...map.values()]
    .filter((d) => d.delta !== 0n)
    .sort((a, b) => {
      const ak =
        a.asset.kind === "native"
          ? `0::${a.address}`
          : `1::${(a.asset as any).token}::${a.address}`;
      const bk =
        b.asset.kind === "native"
          ? `0::${b.address}`
          : `1::${(b.asset as any).token}::${b.address}`;
      return ak < bk ? -1 : 1;
    });

  return { deltas };
}
