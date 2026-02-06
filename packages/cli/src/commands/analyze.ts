import { Command } from "commander";
import { mustGetString, isTxHash, normalizeHex } from "../utils/args.js";
import { writeJson } from "../output/jsonOutput.js";
import { printHeadline, printKV, printSection } from "../output/prettyPrint.js";

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
} from "@etherscope/core";

export function registerAnalyze(program: Command) {
  program
    .command("analyze")
    .description("Analyze a transaction hash and output a JSON report")
    .argument("<txHash>", "Transaction hash (0x...)")
    .option("--rpc <url>", "RPC URL (or env RPC_URL)")
    .option("--chain-id <id>", "Chain id (optional)", (x) => Number(x))
    .option("--pretty", "Pretty print summary to stderr (JSON still goes to stdout)")
    .option("--include-debug", "Include debug callTree in report", false)
    .option("--no-explain", "Disable signature/explanations lookup (offline mode)")
    .action(async (txHashArg: string, opts: any) => {
      const txHash = normalizeHex(mustGetString(txHashArg, "txHash"));
      if (!isTxHash(txHash)) throw new Error(`Invalid txHash: ${txHash}`);

      const rpcUrl = (opts.rpc as string | undefined) ?? process.env.RPC_URL;
      if (!rpcUrl) throw new Error(`Missing RPC URL. Use --rpc or set RPC_URL env.`);

      const cache = new Cache({ maxEntries: 50_000, ttlMs: 10 * 60_000 });

      const rpc = new RpcClient({
        url: rpcUrl,
        timeoutMs: 60_000,
        retry: { retries: 1, baseDelayMs: 300, jitterMs: 100 }
      });

      const tracer = new DebugTracer(rpc, { flavor: "geth_callTracer", cache });
      const receiptProvider = new ReceiptProvider(rpc, { cache });

      if (opts.pretty) {
        printHeadline("EtherScope Analyze");
        printKV("txHash", txHash);
        printKV("rpc", rpcUrl);
      }

      // 1) trace -> call tree
      const norm = await tracer.traceTransaction(txHash);
      const trace = parseTraceToCallTree(norm);

      // 2) receipt logs
      const receipt = await receiptProvider.getTransactionReceipt(txHash);

      // 3) receipt-first token transfers + callId attribution
      const tokenTransfers = extractTokenTransfers({ receiptLogs: receipt.logs, traceRoot: trace.root });

      // 4) gas + graph
      const gas = profileGas(trace.root, (c) => (c.input ? c.input.slice(0, 10).toLowerCase() : undefined));
      const graph = buildInteractionGraph(trace.root, (c) => (c.input ? c.input.slice(0, 10) : undefined));

      // 5) vuln engine
      const engine = new VulnEngine({
        rules: [reentrancyRule, uncheckedCallRule, accessControlRule, dangerousDelegatecallRule]
      });
      const findings = engine.run(trace.root, trace.flat);

      // 6) explanations (optional)
      let explanations: any = undefined;
      if (opts.explain !== false) {
        const sigLookup = new SignatureLookup({ cache, timeoutMs: 4000, maxHits: 1 });
        explanations = await buildExplanationsAsync({ trace, tokenTransfers, sigLookup });
      }

      const report = buildReport({
        chainId: opts.chainId,
        txHash,
        trace,
        gas,
        tokenTransfers,
        findings,
        graph,
        includeDebugTree: Boolean(opts.includeDebug),
        explanations
      } as any);

      if (opts.pretty) {
        printSection("Summary");
        printKV("calls", trace.flat.length);
        printKV("tokenTransfers", tokenTransfers.length);
        printKV("findings", findings.length);
      }

      const json = toJson(report);
      writeJson(json);
    });
}
