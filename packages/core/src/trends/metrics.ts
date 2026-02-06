import { CallNode } from "../trace/types.js";
import { TokenTransfer } from "../state/types.js";
import { Finding } from "../vuln/types.js";
import { TrendMetrics } from "./types.js";

export function computeMetrics(
  root: CallNode,
  flat: CallNode[],
  transfers: TokenTransfer[],
  findings: Finding[]
): TrendMetrics {
  const maxDepth = Math.max(...flat.map((c) => c.depth), 0);
  const totalGasUsed = root.gasUsed;

  const topContracts = [...new Map(flat.filter((c) => c.to).map((c) => [c.to!.toLowerCase(), c.to!])).values()].slice(0, 10);

  return {
    totalCalls: flat.length,
    maxDepth,
    totalGasUsed,
    numTokenTransfers: transfers.length,
    numFindings: findings.length,
    topContracts
  };
}
