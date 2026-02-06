import { TrendMetrics } from "./types.js";

export type TrendAgg = {
  count: number;
  avgCalls: number;
  avgMaxDepth: number;
  avgFindings: number;
};

export function aggregateMetrics(rows: TrendMetrics[]): TrendAgg {
  const n = rows.length || 1;
  const sum = <T extends number>(f: (m: TrendMetrics) => T) => rows.reduce((a, r) => a + f(r), 0);

  return {
    count: rows.length,
    avgCalls: sum((r) => r.totalCalls) / n,
    avgMaxDepth: sum((r) => r.maxDepth) / n,
    avgFindings: sum((r) => r.numFindings) / n
  };
}
