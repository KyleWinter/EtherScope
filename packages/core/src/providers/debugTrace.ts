import { Cache } from "./cache.js";
import { RpcClient } from "./rpcClient.js";

export type TraceFlavor = "geth_callTracer" | "geth_structLogs";

export type DebugTraceOptions = {
  flavor?: TraceFlavor;
  cache?: Cache;

  // 可选：允许覆盖 callTracer 配置（以后你们要 onlyTopCall / withLog / timeout 都能调）
  callTracer?: {
    withLog?: boolean;
    onlyTopCall?: boolean;
    timeout?: string; // e.g. "20s"
  };

  // 可选：structLogs 的配置
  structLogs?: {
    disableMemory?: boolean;
    disableStack?: boolean;
    disableStorage?: boolean;
    enableReturnData?: boolean;
    timeout?: string;
  };

  // 可选：标准化策略
  normalize?: {
    lowerCaseAddress?: boolean;
  };
};

export type GethCallTracerConfig = {
  tracer: "callTracer";
  tracerConfig?: {
    withLog?: boolean;
    onlyTopCall?: boolean;
  };
  timeout?: string;
};

export type StructLogsConfig = {
  disableMemory?: boolean;
  disableStack?: boolean;
  disableStorage?: boolean;
  enableReturnData?: boolean;
  timeout?: string;
};

export type NormalizedTrace = {
  type: string;
  from: string;
  to?: string;
  input?: string;
  output?: string;
  value?: string; // keep as hex/decimal string; downstream toBigint() can parse
  gas?: string;
  gasUsed?: string;
  error?: string;
  revertReason?: string;
  calls?: NormalizedTrace[];
  logs?: Array<{
    address: string;
    topics: string[];
    data: string;
  }>;
};

function isHexString(x: any): x is string {
  return typeof x === "string" && x.startsWith("0x");
}

function toStringMaybe(x: any): string | undefined {
  if (x === undefined || x === null) return undefined;
  if (typeof x === "string") return x;
  if (typeof x === "number") return String(x);
  if (typeof x === "bigint") return x.toString(10);
  return undefined;
}

function normalizeHex(x: any): string | undefined {
  if (x === undefined || x === null) return undefined;
  if (typeof x === "string") {
    if (x.startsWith("0x")) return x;
    // 有的节点返回 "" 或 非 hex，这里直接丢弃（避免污染下游）
    return undefined;
  }
  return undefined;
}

function normalizeAddr(x: any, lower: boolean): string {
  if (typeof x !== "string" || x.length === 0) return "0x";
  const v = x.startsWith("0x") ? x : `0x${x}`;
  return lower ? v.toLowerCase() : v;
}

function normalizeTopics(topics: any, lower: boolean): string[] {
  if (!Array.isArray(topics)) return [];
  return topics
    .filter((t) => typeof t === "string" && t.length > 0)
    .map((t) => (lower ? t.toLowerCase() : t));
}

function normalizeLogs(logs: any, lower: boolean): NormalizedTrace["logs"] | undefined {
  if (!Array.isArray(logs)) return undefined;
  return logs.map((l: any) => ({
    address: normalizeAddr(l?.address, lower),
    topics: normalizeTopics(l?.topics, lower),
    data: typeof l?.data === "string" && l.data.startsWith("0x") ? l.data : "0x"
  }));
}

export class DebugTracer {
  constructor(
    private rpc: RpcClient,
    private opts: DebugTraceOptions = {}
  ) {}

  async traceTransaction(txHash: string): Promise<NormalizedTrace> {
    const flavor = this.opts.flavor ?? "geth_callTracer";
    const cache = this.opts.cache;

    const key = `trace:tx:${flavor}:${txHash}`;
    if (cache) return cache.getOrSet(key, () => this.traceTransactionUncached(txHash, flavor));
    return this.traceTransactionUncached(txHash, flavor);
  }

  async traceCall(
    call: { from?: string; to: string; data?: string; value?: string },
    blockTag: string | number = "latest"
  ): Promise<NormalizedTrace> {
    const flavor = this.opts.flavor ?? "geth_callTracer";
    if (flavor !== "geth_callTracer") {
      throw new Error("traceCall currently supports only geth_callTracer");
    }

    const cache = this.opts.cache;
    const key = `trace:call:${blockTag}:${normalizeAddr(call.to, true)}:${call.data ?? ""}:${call.from ?? ""}:${call.value ?? ""}`;
    if (cache) return cache.getOrSet(key, () => this.traceCallUncached(call, blockTag));
    return this.traceCallUncached(call, blockTag);
  }

  private async traceCallUncached(
    call: { from?: string; to: string; data?: string; value?: string },
    blockTag: string | number
  ): Promise<NormalizedTrace> {
    const cfg: GethCallTracerConfig = {
      tracer: "callTracer",
      tracerConfig: {
        withLog: this.opts.callTracer?.withLog ?? true,
        onlyTopCall: this.opts.callTracer?.onlyTopCall ?? false
      },
      timeout: this.opts.callTracer?.timeout ?? "20s"
    };

    const raw = await this.rpc.call<any>("debug_traceCall", [call, blockTag, cfg]);
    return this.normalizeCallTracer(raw);
  }

  private async traceTransactionUncached(txHash: string, flavor: TraceFlavor): Promise<NormalizedTrace> {
    if (flavor === "geth_callTracer") {
      const cfg: GethCallTracerConfig = {
        tracer: "callTracer",
        tracerConfig: {
          withLog: this.opts.callTracer?.withLog ?? true,
          onlyTopCall: this.opts.callTracer?.onlyTopCall ?? false
        },
        timeout: this.opts.callTracer?.timeout ?? "20s"
      };

      const raw = await this.rpc.call<any>("debug_traceTransaction", [txHash, cfg]);
      return this.normalizeCallTracer(raw);
    }

    const cfg: StructLogsConfig = {
      disableStorage: this.opts.structLogs?.disableStorage ?? true,
      disableStack: this.opts.structLogs?.disableStack ?? true,
      disableMemory: this.opts.structLogs?.disableMemory ?? true,
      enableReturnData: this.opts.structLogs?.enableReturnData ?? true,
      timeout: this.opts.structLogs?.timeout ?? "20s"
    };

    const raw = await this.rpc.call<any>("debug_traceTransaction", [txHash, cfg]);
    return this.normalizeStructLogs(raw);
  }

  private normalizeCallTracer(raw: any): NormalizedTrace {
    const lower = this.opts.normalize?.lowerCaseAddress ?? true;

    const norm = (n: any): NormalizedTrace => {
      const type = typeof n?.type === "string" && n.type.length > 0 ? n.type : "CALL";

      // 注意：不同实现可能把 gas/value 作为 number / hex-string / decimal-string
      const gas = toStringMaybe(n?.gas);
      const gasUsed = toStringMaybe(n?.gasUsed);
      const value = toStringMaybe(n?.value);

      // input/output 通常是 0x..；如果不是，丢弃避免污染
      const input = normalizeHex(n?.input);
      const output = normalizeHex(n?.output);

      // 有的节点 error / revertReason 不同字段名，这里做容错
      const error = typeof n?.error === "string" ? n.error : undefined;
      const revertReason =
        typeof n?.revertReason === "string"
          ? n.revertReason
          : typeof n?.revert === "string"
            ? n.revert
            : undefined;

      return {
        type,
        from: normalizeAddr(n?.from, lower),
        to: n?.to ? normalizeAddr(n.to, lower) : undefined,
        input,
        output,
        value: value,
        gas,
        gasUsed,
        error,
        revertReason,
        logs: normalizeLogs(n?.logs, lower),
        calls: Array.isArray(n?.calls) ? n.calls.map(norm) : undefined
      };
    };

    return norm(raw);
  }

  private normalizeStructLogs(raw: any): NormalizedTrace {
    // 说明：debug_traceTransaction 的 structLogs 返回里通常没有 from/to/input 这些“交易级字段”
    // 所以我们只保证：不会炸；给出可用的 error/gas/gasUsed/output(returnValue) 信息
    // 以后你们要做 opcode -> call tree 再在这里扩展
    const lower = this.opts.normalize?.lowerCaseAddress ?? true;

    return {
      type: "CALL",
      from: normalizeAddr(raw?.from ?? "0x", lower),
      to: raw?.to ? normalizeAddr(raw.to, lower) : undefined,
      input: isHexString(raw?.input) ? raw.input : undefined,
      output: isHexString(raw?.returnValue) ? raw.returnValue : undefined,
      gas: toStringMaybe(raw?.gas),
      gasUsed: toStringMaybe(raw?.gasUsed),
      error: typeof raw?.error === "string" ? raw.error : undefined
    };
  }
}
