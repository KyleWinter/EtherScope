import type { TraceParseResult } from "../trace/types.js";
import type { GasProfile } from "../gas/types.js";
import type { Finding } from "../vuln/types.js";
import type { InteractionGraph } from "../graph/types.js";
import type { TrendMetrics } from "../trends/types.js";
import type { TokenTransfer, BalanceChange, StorageDiffItem, AssetBalanceChange } from "../state/types.js";

export type ReportExplanations = {
  callsById: Record<
    string,
    {
      callId: string;
      type?: string;
      from?: string;
      to?: string;
      selector?: string;
      signature?: string;
    }
  >;
  transfers: Array<{
    token: string;
    from: string;
    to: string;
    value: string; // bigint string
    callId?: string;
    call?: {
      callId: string;
      type?: string;
      from?: string;
      to?: string;
      selector?: string;
      signature?: string;
    };
    human: string;
  }>;
};

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
    assetDeltas?: AssetBalanceChange[];
    storageDiff?: StorageDiffItem[];
  };
  vuln?: {
    findings: Finding[];
  };
  graph?: InteractionGraph;
  trends?: TrendMetrics;
  debug?: {
    callTree?: TraceParseResult["root"];
    explanations?: ReportExplanations;
  };
};
