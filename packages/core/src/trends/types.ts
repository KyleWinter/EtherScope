export type TrendMetrics = {
  txHash?: string;
  chainId?: number;
  timestampMs?: number;

  totalCalls: number;
  maxDepth: number;

  totalGasUsed?: bigint;

  numTokenTransfers: number;
  numFindings: number;
  topContracts: string[];
};
