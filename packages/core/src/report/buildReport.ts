import { TraceParseResult } from "../trace/types.js";
import { GasProfile } from "../gas/types.js";
import { TokenTransfer, BalanceChange, StorageDiffItem } from "../state/types.js";
import { Finding } from "../vuln/types.js";
import { InteractionGraph } from "../graph/types.js";
import { TrendMetrics } from "../trends/types.js";
import { AnalysisReport } from "./types.js";

export type BuildReportInput = {
  chainId?: number;
  txHash?: string;

  trace: TraceParseResult;

  gas?: GasProfile;
  tokenTransfers?: TokenTransfer[];
  balanceChanges?: BalanceChange[];
  storageDiff?: StorageDiffItem[];

  findings?: Finding[];
  graph?: InteractionGraph;
  trends?: TrendMetrics;

  includeDebugTree?: boolean;
};

export function buildReport(input: BuildReportInput): AnalysisReport {
  const flat = input.trace.flat;
  const maxDepth = Math.max(...flat.map((c) => c.depth), 0);

  return {
    meta: {
      chainId: input.chainId,
      txHash: input.txHash,
      createdAtMs: Date.now(),
      coreVersion: "0.1.0"
    },
    trace: {
      rootId: input.trace.root.id,
      totalCalls: flat.length,
      maxDepth
    },
    gas: input.gas,
    state: {
      tokenTransfers: input.tokenTransfers ?? [],
      balanceChanges: input.balanceChanges,
      storageDiff: input.storageDiff
    },
    vuln: {
      findings: input.findings ?? []
    },
    graph: input.graph,
    trends: input.trends,
    debug: input.includeDebugTree ? { callTree: input.trace.root } : undefined
  };
}
