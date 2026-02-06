import { describe, it, expect } from "vitest";
import {
  Cache,
  RpcClient,
  DebugTracer,
  parseTraceToCallTree,
  extractTokenTransfersFromCallTree,
  profileGas,
  buildInteractionGraph,
  VulnEngine,
  reentrancyRule,
  uncheckedCallRule,
  accessControlRule,
  dangerousDelegatecallRule,
  buildReport,
  toJson
} from "../../src/index.js";

const RPC_URL = process.env.RPC_URL;
const TX_HASH = process.env.TX_HASH;

describe("E2E analyze tx", () => {
  if (!RPC_URL || !TX_HASH) {
    it.skip("Set RPC_URL and TX_HASH to run e2e (requires debug_traceTransaction support)", async () => {});
    return;
  }

  it(
    "analyzes a real tx and produces report JSON",
    async () => {
      const cache = new Cache({ maxEntries: 2000, ttlMs: 10 * 60_000 });
      const rpc = new RpcClient({
        url: RPC_URL,
        timeoutMs: 60_000,
        retry: { retries: 1, baseDelayMs: 300, jitterMs: 100 }
      });
      const tracer = new DebugTracer(rpc, { flavor: "geth_callTracer", cache });

      const norm = await tracer.traceTransaction(TX_HASH);
      const trace = parseTraceToCallTree(norm);

      expect(trace.flat.length).toBeGreaterThan(0);

      const transfers = extractTokenTransfersFromCallTree(trace.root);
      const gas = profileGas(trace.root, (c) => (c.input ? c.input.slice(0, 10).toLowerCase() : undefined));
      const graph = buildInteractionGraph(trace.root, (c) => (c.input ? c.input.slice(0, 10) : undefined));

      const engine = new VulnEngine({
        rules: [reentrancyRule, uncheckedCallRule, accessControlRule, dangerousDelegatecallRule]
      });
      const findings = engine.run(trace.root, trace.flat);

      const report = buildReport({
        txHash: TX_HASH,
        trace,
        gas,
        tokenTransfers: transfers,
        findings,
        graph,
        includeDebugTree: false
      });

      const json = toJson(report);
      expect(typeof json).toBe("string");
      expect(json.includes('"txHash"')).toBe(true);
    },
    120_000 // E2E 超时：debug_trace 很容易 > 5s
  );
});
