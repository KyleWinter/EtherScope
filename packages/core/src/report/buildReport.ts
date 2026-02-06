import { TraceParseResult } from "../trace/types.js";
import { GasProfile } from "../gas/types.js";
import { TokenTransfer, BalanceChange, StorageDiffItem, AssetBalanceChange } from "../state/types.js";
import { Finding } from "../vuln/types.js";
import { InteractionGraph } from "../graph/types.js";
import { TrendMetrics } from "../trends/types.js";
import { AnalysisReport } from "./types.js";
import { buildUnifiedBalanceAttribution } from "../state/unifiedAttribution.js";

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

  const tokenTransfers: TokenTransfer[] = input.tokenTransfers ?? [];

  // ✅ 统一归因（ETH + ERC20）
  // - 旧字段 balanceChanges: 仅 ETH（deltaWei），兼容现有 report
  // - 新字段 assetDeltas: 统一账本（native + erc20）
  let computedEthBalanceChanges: BalanceChange[] | undefined = undefined;
  let computedAssetDeltas: AssetBalanceChange[] | undefined = undefined;

  try {
    const unified = buildUnifiedBalanceAttribution(input.trace.root, tokenTransfers);
    computedEthBalanceChanges = unified.ethBalanceChanges;
    computedAssetDeltas = unified.assetDeltas;
  } catch {
    // 保持报告生成不失败（例如：trace.root 结构异常）
    computedEthBalanceChanges = undefined;
    computedAssetDeltas = undefined;
  }

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
      // ✅ 优先用调用方传入的 balanceChanges；否则用我们从 trace 估算的 ETH 变化
      balanceChanges: input.balanceChanges ?? computedEthBalanceChanges,
      // ✅ 新字段：统一账本（若 types.ts / report/types.ts 已加）
      assetDeltas: computedAssetDeltas,
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

