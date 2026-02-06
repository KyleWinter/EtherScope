import type { TraceParseResult } from "../trace/types.js";
import type { GasProfile } from "../gas/types.js";
import type { TokenTransfer, BalanceChange, StorageDiffItem, AssetBalanceChange } from "../state/types.js";
import type { Finding } from "../vuln/types.js";
import type { InteractionGraph } from "../graph/types.js";
import type { TrendMetrics } from "../trends/types.js";
import type { AnalysisReport, ReportExplanations } from "./types.js";

import { buildUnifiedBalanceAttribution } from "../state/unifiedAttribution.js";

export type BuildReportInput = {
  chainId?: number;
  txHash?: string;

  trace: TraceParseResult;

  gas?: GasProfile;
  tokenTransfers?: TokenTransfer[];

  /**
   * 可选：外部已算好的 ETH balance changes（更精确：来自 receipt/stateDiff）
   * 若不传，将尝试从 trace + transfers 做估算
   */
  balanceChanges?: BalanceChange[];

  /**
   * 可选：外部已算好的统一资产变化（native + erc20）
   * 若不传，将尝试从 trace + transfers 生成
   */
  assetDeltas?: AssetBalanceChange[];

  storageDiff?: StorageDiffItem[];

  findings?: Finding[];
  graph?: InteractionGraph;
  trends?: TrendMetrics;

  /**
   * 是否带 callTree（体积很大；默认不带）
   */
  includeDebugTree?: boolean;

  /**
   * 可读化解释信息（selector->signature / transfer human string）
   * 通常由 report/explain.ts 生成
   */
  explanations?: ReportExplanations;
};

export function buildReport(input: BuildReportInput): AnalysisReport {
  const flat = input.trace.flat;
  const maxDepth = Math.max(...flat.map((c) => c.depth), 0);

  const tokenTransfers: TokenTransfer[] = input.tokenTransfers ?? [];

  // 统一归因（ETH + ERC20）
  // 优先级：显式传入 > 自动推导
  let computedEthBalanceChanges: BalanceChange[] | undefined = undefined;
  let computedAssetDeltas: AssetBalanceChange[] | undefined = undefined;

  if (input.balanceChanges || input.assetDeltas) {
    computedEthBalanceChanges = input.balanceChanges;
    computedAssetDeltas = input.assetDeltas;
  } else {
    try {
      const unified = buildUnifiedBalanceAttribution(input.trace.root, tokenTransfers);
      computedEthBalanceChanges = unified.ethBalanceChanges;
      computedAssetDeltas = unified.assetDeltas;
    } catch {
      computedEthBalanceChanges = undefined;
      computedAssetDeltas = undefined;
    }
  }

  // debug: 只要有任意 debug 内容，就输出 debug 对象
  const debug: AnalysisReport["debug"] | undefined = (() => {
    const wantTree = Boolean(input.includeDebugTree);
    const hasExplain = Boolean(input.explanations);

    if (!wantTree && !hasExplain) return undefined;

    return {
      callTree: wantTree ? input.trace.root : undefined,
      explanations: input.explanations
    };
  })();

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
      tokenTransfers,
      balanceChanges: computedEthBalanceChanges,
      assetDeltas: computedAssetDeltas,
      storageDiff: input.storageDiff
    },
    vuln: {
      findings: input.findings ?? []
    },
    graph: input.graph,
    trends: input.trends,
    debug
  };
}
