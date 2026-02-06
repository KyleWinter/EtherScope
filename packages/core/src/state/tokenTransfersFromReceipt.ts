import { CallNode } from "../trace/types.js";
import { TokenTransfer } from "./types.js";
import { ReceiptLog, matchReceiptLogsToCallIds } from "./logAttribution.js";

const TRANSFER_TOPIC0 =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function normAddrFromTopic(topic: string): string {
  // topic: 32 bytes, last 20 bytes is address
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

function parseLogIndex(x: any, fallback: number): number {
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    if (x.startsWith("0x")) return Number(BigInt(x));
    if (/^\d+$/.test(x)) return Number(x);
  }
  return fallback;
}

/**
 * 从 receipt logs 抽 ERC20 Transfer，并尽量绑定 callId（如果给了 callTree root）
 */
export function extractTokenTransfersFromReceiptLogs(
  receiptLogs: ReceiptLog[],
  traceRoot?: CallNode
): TokenTransfer[] {
  const callIdByLogIndex = traceRoot ? matchReceiptLogsToCallIds(receiptLogs, traceRoot) : new Map<number, string>();

  const out: TokenTransfer[] = [];

  for (let i = 0; i < receiptLogs.length; i++) {
    const l = receiptLogs[i];
    const topics = (l.topics ?? []).map((t) => t.toLowerCase());
    if (topics.length < 3) continue;
    if (topics[0] !== TRANSFER_TOPIC0) continue;

    const token = l.address.toLowerCase();
    const from = normAddrFromTopic(topics[1]);
    const to = normAddrFromTopic(topics[2]);
    const value = parseBigIntHex((l.data ?? "0x0").toLowerCase());

    if (value === 0n) continue;
    if (from === to) continue;

    const logIdx = parseLogIndex(l.logIndex, i);
    const callId = callIdByLogIndex.get(logIdx);

    out.push({ token, from, to, value, callId });
  }

  return out;
}
