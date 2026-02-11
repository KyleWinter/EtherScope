export interface Finding {
  severity: "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  location?: {
    file: string;
    line?: number;
    column?: number;
  };
  impact?: string;
  confidence?: string;
}

export interface AnalysisReport {
  id: string;
  txHash?: string;
  createdAt: string;
  tools: {
    slither?: {
      ok: boolean;
      exitCode?: number;
      parseError?: string;
      noJson?: boolean;
    };
    mythril?: {
      ok: boolean;
      exitCode?: number;
      parseError?: string;
      noJson?: boolean;
    };
  };
  findings: Finding[];
}

export interface GasTrend {
  timestamp: number;
  gasUsed: number;
  txHash: string;
  functionName?: string;
}

export interface MonitoredAddress {
  id: string;
  address: string;
  subscribedAt: number;
}

export interface MonitorAlert {
  address: string;
  message: string;
  timestamp: number;
}

export type WsMessage =
  | { type: "job:update"; jobId: string; message: string }
  | { type: "job:done"; jobId: string; reportId?: string; error?: string }
  | { type: "monitor:alert"; address: string; message: string };

// Etherscan types
export interface EthTransaction {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  gasPrice: string;
  input: string;
  blockNumber: string;
  blockHash: string;
  transactionIndex: string;
  nonce: string;
  type?: string;
}

export interface EthLog {
  address: string;
  topics: string[];
  data: string;
  logIndex: string;
  transactionIndex: string;
  blockNumber: string;
}

export interface EthTransactionReceipt {
  status: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  logs: EthLog[];
  contractAddress: string | null;
  transactionHash: string;
  blockNumber: string;
}

export interface EthBlock {
  number: string;
  hash: string;
  timestamp: string;
  miner: string;
  gasUsed: string;
  gasLimit: string;
  baseFeePerGas?: string;
  transactions: EthTransaction[] | string[];
  size: string;
}

export interface ContractInfo {
  address: string;
  name: string;
  compiler: string;
  sourceCode: string;
  abi: string;
  isVerified: boolean;
  creator: string;
  creationTxHash: string;
  balance: string;
}

// Transaction Trace types
export interface TraceCall {
  type: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasUsed: string;
  input: string;
  output: string;
  error?: string;
  calls?: TraceCall[];
  depth: number;
}

export interface TraceResult {
  calls: TraceCall[];
  gasUsed: string;
  success: boolean;
  returnValue?: string;
  error?: string;
}

export interface InternalTransaction {
  type: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasUsed: string;
  input: string;
  output: string;
  depth: number;
  index: number;
  error?: string;
}

export interface DecodedLog {
  address: string;
  topics: string[];
  data: string;
  eventName?: string;
  args?: Record<string, any>;
  signature?: string;
}

// State Diff types
export interface StorageChange {
  address: string;
  slot: string;
  before: string;
  after: string;
}

export interface BalanceChange {
  address: string;
  before: string;
  after: string;
  delta: string;
}

export interface TokenTransfer {
  type: "ERC20" | "ERC721" | "ERC1155";
  tokenAddress: string;
  from: string;
  to: string;
  tokenId?: string;
  value?: string;
  amount?: string;
  logIndex: number;
}

export interface StateDiff {
  balanceChanges: BalanceChange[];
  storageChanges: StorageChange[];
  tokenTransfers: TokenTransfer[];
}

// Gas Profiling types
export interface OpcodeStats {
  opcode: string;
  count: number;
  totalGas: number;
  avgGas: number;
}

export interface FunctionGasUsage {
  selector: string;
  functionName?: string;
  gasUsed: number;
  callCount: number;
  avgGas: number;
}

export interface OptimizationSuggestion {
  severity: "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  gasImpact?: number;
}

export interface GasProfile {
  totalGas: number;
  functionBreakdown: FunctionGasUsage[];
  opcodeStats: OpcodeStats[];
  suggestions: OptimizationSuggestion[];
}
