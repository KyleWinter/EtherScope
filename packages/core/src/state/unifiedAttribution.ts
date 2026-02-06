import { CallNode } from "../trace/types.js";
import { BalanceChange, TokenTransfer, AssetBalanceChange } from "./types.js";

// --- helpers ---
function normAddr(a: string): string {
  return a.toLowerCase();
}

function addToMap(map: Map<string, bigint>, addr: string, delta: bigint) {
  if (delta === 0n) return;
  const k = normAddr(addr);
  map.set(k, (map.get(k) ?? 0n) + delta);
}

function stableBalanceChanges(map: Map<string, bigint>): BalanceChange[] {
  return [...map.entries()]
    .filter(([, d]) => d !== 0n)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([address, deltaWei]) => ({ address, deltaWei }));
}

function stableAssetDeltas(map: Map<string, AssetBalanceChange>): AssetBalanceChange[] {
  return [...map.values()].filter((x) => x.delta !== 0n).sort((a, b) => {
    const ak =
      a.asset.kind === "native"
        ? `0::${a.address}`
        : `1::${a.asset.token.toLowerCase()}::${a.address}`;
    const bk =
      b.asset.kind === "native"
        ? `0::${b.address}`
        : `1::${b.asset.token.toLowerCase()}::${b.address}`;
    return ak < bk ? -1 : 1;
  });
}

function parseValue(v: any): bigint {
  if (v === undefined || v === null) return 0n;
  if (typeof v === "bigint") return v;
  if (typeof v === "number") return BigInt(v);
  if (typeof v === "string") {
    if (v.startsWith("0x")) return BigInt(v);
    if (/^\d+$/.test(v)) return BigInt(v);
  }
  return 0n;
}

// ✅ 关键：evidence 是可选数组，先 NonNullable 再取 item 类型
type EvidenceItem = NonNullable<AssetBalanceChange["evidence"]>[number];

/**
 * 统一归因：
 * - ETH：来自 trace CALL.value（估算）
 * - ERC20：来自 TokenTransfer（通常从 receipt logs 提取）
 *
 * 输出两份：
 * - ethBalanceChanges：兼容旧 report.state.balanceChanges（deltaWei）
 * - assetDeltas：新 report.state.assetDeltas（native + erc20）
 */
export function buildUnifiedBalanceAttribution(root: CallNode, tokenTransfers: TokenTransfer[]) {
  // 1) ETH map (for old BalanceChange[])
  const ethMap = new Map<string, bigint>();

  // 2) unified map (AssetBalanceChange keyed by "native::addr" or "erc20:token::addr")
  const assetMap = new Map<string, AssetBalanceChange>();

  const addAsset = (
    key: string,
    seed: Omit<AssetBalanceChange, "delta" | "evidence">,
    delta: bigint,
    evidence?: EvidenceItem
  ) => {
    const cur = assetMap.get(key);

    if (!cur) {
      assetMap.set(key, {
        ...seed,
        delta,
        evidence: evidence ? [evidence] : undefined
      });
      return;
    }

    cur.delta += delta;
    if (evidence) {
      // 这里 TS 有时会因为可选属性推断变窄，写得“啰嗦一点”最稳
      const arr = (cur.evidence ??= []);
      arr.push(evidence);
    }
  };

  // --- ETH from trace value ---
  const walk = (n: CallNode) => {
    const v = parseValue(n.value);

    // 注意：这里仍然是“估算”，并且只统计无 error 的 call frame
    if (!n.error && v > 0n && n.to) {
      const from = normAddr(n.from);
      const to = normAddr(n.to);

      if (from !== to) {
        addToMap(ethMap, from, -v);
        addToMap(ethMap, to, v);

        addAsset(
          `native::${from}`,
          { asset: { kind: "native" }, address: from },
          -v,
          { type: "callValue", callId: n.id }
        );

        addAsset(
          `native::${to}`,
          { asset: { kind: "native" }, address: to },
          v,
          { type: "callValue", callId: n.id }
        );
      }
    }

    for (const c of n.children) walk(c);
  };

  walk(root);

  // --- ERC20 from tokenTransfers ---
  for (const t of tokenTransfers) {
    const token = normAddr(t.token);
    const from = normAddr(t.from);
    const to = normAddr(t.to);
    const amt = t.value;

    if (amt === 0n || from === to) continue;

    addAsset(
      `erc20:${token}::${from}`,
      { asset: { kind: "erc20", token }, address: from },
      -amt,
      { type: "erc20Transfer", token, callId: t.callId }
    );

    addAsset(
      `erc20:${token}::${to}`,
      { asset: { kind: "erc20", token }, address: to },
      amt,
      { type: "erc20Transfer", token, callId: t.callId }
    );
  }

  const ethBalanceChanges: BalanceChange[] = stableBalanceChanges(ethMap);
  const assetDeltas: AssetBalanceChange[] = stableAssetDeltas(assetMap);

  return { ethBalanceChanges, assetDeltas };
}
