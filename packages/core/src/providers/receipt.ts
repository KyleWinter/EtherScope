import { Cache } from "./cache.js";
import { RpcClient } from "./rpcClient.js";

// 你们 logAttribution.ts 里用的 ReceiptLog 结构就是这个形状
export type ReceiptLog = {
  address: string;
  topics: string[];
  data: string;
  logIndex?: number | string;
};

export type TxReceipt = {
  transactionHash?: string;
  status?: string; // "0x1" / "0x0"
  gasUsed?: string; // hex
  blockNumber?: string; // hex
  logs: ReceiptLog[];
};

export type ReceiptProviderOptions = {
  cache?: Cache;
};

function normHex(x: any, fallback = "0x"): string {
  if (typeof x !== "string") return fallback;
  const s = x.toLowerCase();
  return s.startsWith("0x") ? s : `0x${s}`;
}

function normAddr(x: any): string {
  if (typeof x !== "string") return "0x";
  return x.toLowerCase();
}

function normTopics(x: any): string[] {
  if (!Array.isArray(x)) return [];
  return x.map((t) => normHex(t, "0x"));
}

export class ReceiptProvider {
  constructor(private rpc: RpcClient, private opts: ReceiptProviderOptions = {}) {}

  async getTransactionReceipt(txHash: string): Promise<TxReceipt> {
    const key = `receipt:${txHash.toLowerCase()}`;
    const cache = this.opts.cache;

    if (cache) {
      return cache.getOrSet(key, () => this.getTransactionReceiptUncached(txHash));
    }
    return this.getTransactionReceiptUncached(txHash);
  }

  private async getTransactionReceiptUncached(txHash: string): Promise<TxReceipt> {
    const raw = await this.rpc.call<any>("eth_getTransactionReceipt", [txHash]);

    if (!raw) {
      // 节点没找到：可能 tx 还没被索引/或者 hash 不存在
      return { transactionHash: txHash, logs: [] };
    }

    const logsRaw = Array.isArray(raw.logs) ? raw.logs : [];
    const logs: ReceiptLog[] = logsRaw.map((l: any) => ({
      address: normAddr(l.address),
      topics: normTopics(l.topics),
      data: normHex(l.data, "0x"),
      logIndex: l.logIndex
    }));

    return {
      transactionHash: raw.transactionHash ?? txHash,
      status: raw.status,
      gasUsed: raw.gasUsed,
      blockNumber: raw.blockNumber,
      logs
    };
  }
}
