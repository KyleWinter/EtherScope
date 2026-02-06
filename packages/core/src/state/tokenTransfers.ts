import { CallNode } from "../trace/types.js";
import { TokenTransfer } from "./types.js";
import { ReceiptLog } from "./logAttribution.js";
import { extractTokenTransfersFromReceiptLogs } from "./tokenTransfersFromReceipt.js";

/**
 * ✅ 新入口：从 receipt logs 抽 Transfer（全量），并尽量绑定 callId（如果提供 traceRoot）
 *
 * 推荐你们的主流程/E2E/CLI 全部走这个：
 *   extractTokenTransfers({ receiptLogs: receipt.logs, traceRoot: trace.root })
 */
export function extractTokenTransfers(args: { receiptLogs: ReceiptLog[]; traceRoot?: CallNode }): TokenTransfer[] {
  return extractTokenTransfersFromReceiptLogs(args.receiptLogs, args.traceRoot);
}

/**
 * 兼容旧逻辑：直接从 callTree 的 logs 抽 Transfer（可能漏，不推荐当主来源）
 * 你们可以保留用于：没有 receipt 的情况下，做 best-effort。
 */
const TRANSFER_TOPIC0 =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function normAddrFromTopic(topic: string): string {
  const t = topic.toLowerCase();
  return "0x" + t.slice(26);
}

function parseBigIntHex(hex: string): bigint {
  try {
    return BigInt(hex);
  } catch {
    return 0n;
  }
}

/**
 * legacy: 从 call tree 抽 token transfers（可能漏）
 */
export function extractTokenTransfersFromCallTree(root: CallNode): TokenTransfer[] {
  const out: TokenTransfer[] = [];

  const walk = (n: CallNode) => {
    if (Array.isArray(n.logs)) {
      for (const l of n.logs) {
        const topics = (l.topics ?? []).map((t) => t.toLowerCase());
        if (topics.length < 3) continue;
        if (topics[0] !== TRANSFER_TOPIC0) continue;

        const token = (l.address ?? "").toLowerCase();
        const from = normAddrFromTopic(topics[1]);
        const to = normAddrFromTopic(topics[2]);
        const value = parseBigIntHex((l.data ?? "0x0").toLowerCase());

        if (value === 0n) continue;
        if (from === to) continue;

        out.push({ token, from, to, value, callId: n.id });
      }
    }

    for (const c of n.children) walk(c);
  };

  walk(root);
  return out;
}
