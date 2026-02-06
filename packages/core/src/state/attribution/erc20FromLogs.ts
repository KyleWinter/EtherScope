import { Erc20Transfer } from "./types.js";

const TRANSFER_TOPIC0 =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function normAddrFromTopic(topic: string): string {
  // topic 是 32 bytes，最后 20 bytes 是地址
  const t = topic.toLowerCase();
  return "0x" + t.slice(26);
}

function hexToBigInt(hex: string): bigint {
  return BigInt(hex);
}

export type ReceiptLog = {
  address: string;
  topics: string[];
  data: string;
  logIndex?: number; // 0x.. or number sometimes
};

function parseLogIndex(x: any, fallback: number): number {
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    if (x.startsWith("0x")) return Number(BigInt(x));
    if (/^\d+$/.test(x)) return Number(x);
  }
  return fallback;
}

export function extractErc20TransfersFromReceiptLogs(logs: ReceiptLog[]): Erc20Transfer[] {
  const out: Erc20Transfer[] = [];
  for (let i = 0; i < logs.length; i++) {
    const l = logs[i];
    const topics = (l.topics ?? []).map((t) => t.toLowerCase());

    if (topics.length < 3) continue;
    if (topics[0] !== TRANSFER_TOPIC0) continue;

    const token = l.address.toLowerCase();
    const from = normAddrFromTopic(topics[1]);
    const to = normAddrFromTopic(topics[2]);

    const data = (l.data ?? "0x0").toLowerCase();
    // ERC20 Transfer amount 在 data（32 bytes hex）
    let amount = 0n;
    try {
      amount = hexToBigInt(data);
    } catch {
      amount = 0n;
    }

    const txLogIndex = parseLogIndex(l.logIndex, i);

    // amount=0 的 transfer 在链上也可能出现，但对余额无影响，跳过
    if (amount === 0n) continue;
    if (from === to) continue;

    out.push({ token, from, to, amount, txLogIndex });
  }
  return out;
}
