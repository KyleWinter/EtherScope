import { TraceParseResult } from "../trace/types.js";
import { GasProfile } from "../gas/types.js";
import { TokenTransfer, BalanceChange, StorageDiffItem } from "../state/types.js";
import { Finding } from "../vuln/types.js";
import { InteractionGraph } from "../graph/types.js";
import { TrendMetrics } from "../trends/types.js";

export type AnalysisReport = {
  meta: {
    chainId?: number;
    txHash?: string;
    createdAtMs: number;
    coreVersion: string;
  };
  trace: {
    rootId: string;
    totalCalls: number;
    maxDepth: number;
  };
  gas?: GasProfile;
  state?: {
    tokenTransfers: TokenTransfer[];
    balanceChanges?: BalanceChange[];
    storageDiff?: StorageDiffItem[];
  };
  vuln?: {
    findings: Finding[];
  };
  graph?: InteractionGraph;
  trends?: TrendMetrics;
  // 可选：把 call tree/flat 放出来给前端调试
  debug?: {
    callTree?: TraceParseResult["root"];
  };
};
