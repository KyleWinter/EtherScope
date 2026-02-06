import { describe, it, expect } from "vitest";
import {
  Cache,
  RpcClient,
  DebugTracer,
  ReceiptProvider,
  parseTraceToCallTree,
  extractTokenTransfers,
  profileGas,
  buildInteractionGraph,
  VulnEngine,
  reentrancyRule,
  uncheckedCallRule,
  accessControlRule,
  dangerousDelegatecallRule,
  SignatureLookup,
  buildExplanationsAsync,
  buildReport,
  toJson
} from "../../src/index.js";

const RPC_URL = process.env.RPC_URL;
const TX_HASH = process.env.TX_HASH;

describe("E2E analyze tx", () => {
  if (!RPC_URL || !TX_HASH) {
    it.skip("Set RPC_URL and TX_HASH to run e2e (requires debug_traceTransaction + eth_getTransactionReceipt)", async () => {});
    return;
  }

  it(
    "analyzes a real tx and produces report JSON (receipt-first + callId attribution + explanations)",
    async () => {
      const cache = new Cache({ maxEntries: 20_000, ttlMs: 10 * 60_000 });

      const rpc = new RpcClient({
        url: RPC_URL,
        timeoutMs: 60_000,
        retry: { retries: 1, baseDelayMs: 300, jitterMs: 100 }
      });

      const tracer = new DebugTracer(rpc, { flavor: "geth_callTracer", cache });
      const receiptProvider = new ReceiptProvider(rpc, { cache });

      // 1) trace -> call tree
      const norm = await tracer.traceTransaction(TX_HASH);
      const trace = parseTraceToCallTree(norm);
      expect(trace.flat.length).toBeGreaterThan(0);

      // 2) receipt logs（全量）
      const receipt = await receiptProvider.getTransactionReceipt(TX_HASH);
      expect(Array.isArray(receipt.logs)).toBe(true);

      // 3) token transfers：receipt-first + 尽量绑定 callId
      const transfers = extractTokenTransfers({ receiptLogs: receipt.logs, traceRoot: trace.root });

      // 至少不应该爆炸；并且通常会 > 0（但有些 tx 确实没有 Transfer）
      expect(transfers).toBeTruthy();

      // 4) gas + graph
      const gas = profileGas(trace.root, (c) => (c.input ? c.input.slice(0, 10).toLowerCase() : undefined));
      const graph = buildInteractionGraph(trace.root, (c) => (c.input ? c.input.slice(0, 10) : undefined));

      // 5) vuln engine
      const engine = new VulnEngine({
        rules: [reentrancyRule, uncheckedCallRule, accessControlRule, dangerousDelegatecallRule]
      });
      const findings = engine.run(trace.root, trace.flat);

      // 6) explanations（可选联网：4byte/openchain；有 cache 后不会太慢）
      const sigLookup = new SignatureLookup({ cache, timeoutMs: 4000, maxHits: 1 });
      const explanations = await buildExplanationsAsync({
        trace,
        tokenTransfers: transfers,
        sigLookup
      });

      // 7) report
      const report = buildReport({
        txHash: TX_HASH,
        trace,
        gas,
        tokenTransfers: transfers,
        findings,
        graph,
        includeDebugTree: true,
        explanations
      });

      const json = toJson(report);
      expect(typeof json).toBe("string");
      expect(json.includes('"txHash"')).toBe(true);

      // debug.explanations 应该存在（我们 includeDebugTree=true 且传了 explanations）
      expect(json.includes('"explanations"')).toBe(true);
    },
    180_000
  );
});
