import { TraceParseResult } from "../trace/types.js";
import { GasProfile } from "../gas/types.js";
import { Finding } from "../vuln/types.js";
import { InteractionGraph } from "../graph/types.js";
import { TrendMetrics } from "../trends/types.js";
import { TokenTransfer, BalanceChange, StorageDiffItem, AssetBalanceChange } from "../state/types.js";

/**
 * 报告解释信息（用于前端/CLI 可读化展示）
 * - callsById: callId -> (to, selector, signature)
 * - transfers: 每条 token transfer 对应的可读解释
 *
 * 注意：把它放在 types.ts 里是为了避免 import explain.ts 产生循环依赖。
 */
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
  // 可选：把 call tree/flat 放出来给前端调试
  debug?: {
    callTree?: TraceParseResult["root"];
    explanations?: ReportExplanations;
  };
};
