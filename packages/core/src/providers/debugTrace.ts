import { Cache } from "./cache.js";
import { RpcClient } from "./rpcClient.js";

export type TraceFlavor = "geth_callTracer" | "geth_structLogs";

export type DebugTraceOptions = {
  flavor?: TraceFlavor;
  cache?: Cache;
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
  // 统一让 trace/traceParser 只吃一种结构：callTracer 风格（近似）
  type: string;
  from: string;
  to?: string;
  input?: string;
  output?: string;
  value?: string;
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

  private async traceTransactionUncached(txHash: string, flavor: TraceFlavor): Promise<NormalizedTrace> {
    if (flavor === "geth_callTracer") {
      const cfg: GethCallTracerConfig = { tracer: "callTracer", tracerConfig: { withLog: true } };
      const raw = await this.rpc.call<any>("debug_traceTransaction", [txHash, cfg]);
      return this.normalizeCallTracer(raw);
    }

    // structLogs：我们做一个降级策略：直接返回一个“空 calls”的顶层节点（你也可以后续实现 structLogs -> call tree）
    const cfg: StructLogsConfig = { disableStorage: true, disableStack: true, disableMemory: true, enableReturnData: true };
    const raw = await this.rpc.call<any>("debug_traceTransaction", [txHash, cfg]);
    return this.normalizeStructLogs(raw);
  }

  async traceCall(
    call: { from?: string; to: string; data?: string; value?: string },
    blockTag: string | number = "latest"
  ): Promise<NormalizedTrace> {
    const flavor = this.opts.flavor ?? "geth_callTracer";
    if (flavor !== "geth_callTracer") throw new Error("traceCall currently supports only geth_callTracer");

    const cfg: GethCallTracerConfig = { tracer: "callTracer", tracerConfig: { withLog: true } };
    const raw = await this.rpc.call<any>("debug_traceCall", [call, blockTag, cfg]);
    return this.normalizeCallTracer(raw);
  }

  private normalizeCallTracer(raw: any): NormalizedTrace {
    // geth callTracer 本身已经很接近我们要的形态
    const norm = (n: any): NormalizedTrace => ({
      type: n.type ?? "CALL",
      from: n.from,
      to: n.to,
      input: n.input,
      output: n.output,
      value: n.value,
      gas: n.gas,
      gasUsed: n.gasUsed,
      error: n.error,
      revertReason: n.revertReason,
      logs: Array.isArray(n.logs)
        ? n.logs.map((l: any) => ({ address: l.address, topics: l.topics ?? [], data: l.data ?? "0x" }))
        : undefined,
      calls: Array.isArray(n.calls) ? n.calls.map(norm) : undefined
    });
    return norm(raw);
  }

  private normalizeStructLogs(raw: any): NormalizedTrace {
    // 简化：structLogs 只保留顶层错误信息（后续你们可以扩展为 EVM step -> call tree）
    return {
      type: "CALL",
      from: raw?.from ?? "0x",
      to: raw?.to,
      input: raw?.input,
      output: raw?.returnValue,
      gas: raw?.gas,
      gasUsed: raw?.gasUsed,
      error: raw?.error
    };
  }
}
