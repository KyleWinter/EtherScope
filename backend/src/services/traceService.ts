import { ethers } from "ethers";
import { env } from "../config/env";
import { getInternalTxs } from "./etherscanService";

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

export interface DecodedLog {
  address: string;
  topics: string[];
  data: string;
  eventName?: string;
  args?: Record<string, any>;
  signature?: string;
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

class TraceService {
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(env.mainnetRpcUrl);
  }

  /**
   * Get transaction trace using debug_traceTransaction
   */
  async getTransactionTrace(txHash: string): Promise<TraceResult> {
    try {
      // Call debug_traceTransaction with callTracer
      const trace = await this.provider.send("debug_traceTransaction", [
        txHash,
        { tracer: "callTracer" }
      ]);

      // Parse the trace
      const calls = this.parseTrace(trace, 0);

      return {
        calls,
        gasUsed: trace.gasUsed || "0",
        success: !trace.error,
        returnValue: trace.output,
        error: trace.error,
      };
    } catch (error: any) {
      console.error("[TraceService] debug_traceTransaction not available:", error.message);

      // Fallback: Return minimal trace info
      // In production, you could use Etherscan's internal transaction API here
      throw new Error("debug_traceTransaction is not available on this RPC endpoint. Please use a provider that supports debug APIs (Alchemy, Infura paid tier, or local node).");
    }
  }

  /**
   * Parse trace recursively
   */
  private parseTrace(trace: any, depth: number): TraceCall[] {
    const calls: TraceCall[] = [];

    const call: TraceCall = {
      type: trace.type || "CALL",
      from: trace.from || "",
      to: trace.to || "",
      value: trace.value || "0x0",
      gas: trace.gas || "0x0",
      gasUsed: trace.gasUsed || "0x0",
      input: trace.input || "0x",
      output: trace.output || "0x",
      error: trace.error,
      depth,
    };

    // Parse nested calls
    if (trace.calls && Array.isArray(trace.calls)) {
      call.calls = [];
      for (const nestedCall of trace.calls) {
        call.calls.push(...this.parseTrace(nestedCall, depth + 1));
      }
    }

    calls.push(call);
    return calls;
  }

  /**
   * Get internal transactions from trace
   */
  async getInternalTransactions(txHash: string): Promise<InternalTransaction[]> {
    try {
      // Try debug_traceTransaction first
      const traceResult = await this.getTransactionTrace(txHash);
      const internals: InternalTransaction[] = [];
      let index = 0;

      const extractInternals = (calls: TraceCall[]) => {
        for (const call of calls) {
          if (call.depth > 0) {
            internals.push({
              type: call.type,
              from: call.from,
              to: call.to,
              value: call.value,
              gas: call.gas,
              gasUsed: call.gasUsed,
              input: call.input,
              output: call.output,
              depth: call.depth,
              index: index++,
              error: call.error,
            });
          }

          if (call.calls) {
            extractInternals(call.calls);
          }
        }
      };

      extractInternals(traceResult.calls);
      return internals;
    } catch (error: any) {
      console.log("[TraceService] Falling back to Etherscan API for internal transactions");

      // Fallback: Use Etherscan API
      try {
        const etherscanInternals = await getInternalTxs(txHash);

        if (!etherscanInternals || etherscanInternals.length === 0) {
          console.log("[TraceService] No internal transactions found for this transaction");
          return [];
        }

        // Convert Etherscan format to our format
        return etherscanInternals.map((tx: any, index: number) => {
          // Parse value carefully
          let valueWei = "0x0";
          try {
            if (tx.value && tx.value !== "0") {
              // Etherscan returns value in Wei as string
              valueWei = "0x" + BigInt(tx.value).toString(16);
            }
          } catch (e) {
            console.error("[TraceService] Error parsing value:", e);
          }

          return {
            type: tx.type || "CALL",
            from: tx.from,
            to: tx.to,
            value: valueWei,
            gas: tx.gas || "0",
            gasUsed: tx.gasUsed || "0",
            input: tx.input || "0x",
            output: "0x",
            depth: 1, // Etherscan doesn't provide depth info
            index,
            error: tx.isError === "1" ? tx.errCode : undefined,
          };
        });
      } catch (fallbackError: any) {
        console.error("[TraceService] Etherscan fallback failed:", fallbackError.message);
        return []; // Return empty array instead of throwing
      }
    }
  }

  /**
   * Decode event logs using contract ABI
   */
  async decodeEventLogs(logs: any[], contractAddress: string, abi?: any[]): Promise<DecodedLog[]> {
    const decodedLogs: DecodedLog[] = [];

    for (const log of logs) {
      const decoded: DecodedLog = {
        address: log.address,
        topics: log.topics || [],
        data: log.data || "0x",
      };

      try {
        if (abi) {
          // Create interface from ABI
          const iface = new ethers.Interface(abi);

          // Try to decode the log
          if (log.topics && log.topics.length > 0) {
            try {
              const parsedLog = iface.parseLog({
                topics: log.topics,
                data: log.data,
              });

              if (parsedLog) {
                decoded.eventName = parsedLog.name;
                decoded.signature = parsedLog.signature;

                // Convert args to plain object
                decoded.args = {};
                parsedLog.args.forEach((arg: any, index: number) => {
                  const paramName = parsedLog.fragment.inputs[index]?.name || `arg${index}`;
                  decoded.args![paramName] = this.formatValue(arg);
                });
              }
            } catch (e) {
              // Unable to decode with provided ABI, use raw data
              decoded.signature = log.topics[0];
            }
          }
        } else {
          // No ABI provided, just include signature
          decoded.signature = log.topics?.[0];
        }
      } catch (error) {
        console.error("[TraceService] Failed to decode log:", error);
        decoded.signature = log.topics?.[0];
      }

      decodedLogs.push(decoded);
    }

    return decodedLogs;
  }

  /**
   * Format BigInt and other special types to string
   */
  private formatValue(value: any): any {
    if (typeof value === "bigint") {
      return value.toString();
    }
    if (Array.isArray(value)) {
      return value.map(v => this.formatValue(v));
    }
    if (typeof value === "object" && value !== null) {
      const formatted: any = {};
      for (const key in value) {
        formatted[key] = this.formatValue(value[key]);
      }
      return formatted;
    }
    return value;
  }

  /**
   * Get function signature from input data
   */
  getFunctionSignature(input: string): string {
    if (!input || input.length < 10) return "";
    return input.slice(0, 10);
  }

  /**
   * Decode function call using ABI
   */
  decodeFunctionCall(input: string, abi?: any[]): { name: string; args: Record<string, any> } | null {
    if (!abi || !input || input.length < 10) return null;

    try {
      const iface = new ethers.Interface(abi);
      const signature = input.slice(0, 10);

      const decoded = iface.parseTransaction({ data: input });
      if (decoded) {
        const args: Record<string, any> = {};
        decoded.args.forEach((arg: any, index: number) => {
          const paramName = decoded.fragment.inputs[index]?.name || `arg${index}`;
          args[paramName] = this.formatValue(arg);
        });

        return {
          name: decoded.name,
          args,
        };
      }
    } catch (error) {
      console.error("[TraceService] Failed to decode function call:", error);
    }

    return null;
  }

  /**
   * Get state diff for a transaction (storage changes, balance changes)
   */
  async getStateDiff(txHash: string): Promise<StateDiff> {
    try {
      // Try to get prestate tracer
      const trace = await this.provider.send("debug_traceTransaction", [
        txHash,
        { tracer: "prestateTracer", tracerConfig: { diffMode: true } }
      ]);

      const balanceChanges: BalanceChange[] = [];
      const storageChanges: StorageChange[] = [];

      // Parse prestate trace
      if (trace && typeof trace === "object") {
        for (const [address, diff] of Object.entries(trace as Record<string, any>)) {
          // Balance changes
          if (diff.balance) {
            const before = diff.balance["*"]?.from || diff.balance || "0x0";
            const after = diff.balance["*"]?.to || diff.balance || "0x0";

            if (before !== after) {
              const beforeBigInt = BigInt(before);
              const afterBigInt = BigInt(after);
              const delta = afterBigInt - beforeBigInt;

              balanceChanges.push({
                address: address.toLowerCase(),
                before: before,
                after: after,
                delta: "0x" + delta.toString(16),
              });
            }
          }

          // Storage changes
          if (diff.storage) {
            for (const [slot, change] of Object.entries(diff.storage as Record<string, any>)) {
              if (change["*"]) {
                storageChanges.push({
                  address: address.toLowerCase(),
                  slot: slot,
                  before: change["*"].from || "0x0",
                  after: change["*"].to || "0x0",
                });
              }
            }
          }
        }
      }

      return {
        balanceChanges,
        storageChanges,
        tokenTransfers: [], // Will be populated from logs separately
      };
    } catch (error: any) {
      console.error("[TraceService] State diff not available:", error.message);

      // Return empty state diff if RPC doesn't support it
      return {
        balanceChanges: [],
        storageChanges: [],
        tokenTransfers: [],
      };
    }
  }

  /**
   * Get gas profile for a transaction
   */
  async getGasProfile(txHash: string): Promise<GasProfile> {
    try {
      // Get opcode-level trace
      const trace = await this.provider.send("debug_traceTransaction", [
        txHash,
        { disableStorage: false, disableStack: false, enableMemory: false }
      ]);

      // Get call trace for function breakdown
      const callTrace = await this.getTransactionTrace(txHash);

      // Analyze opcodes
      const opcodeStats = this.analyzeOpcodes(trace.structLogs || []);

      // Analyze function calls
      const functionBreakdown = this.analyzeFunctionCalls(callTrace.calls);

      // Generate optimization suggestions
      const suggestions = this.generateOptimizationSuggestions(opcodeStats, functionBreakdown, trace.structLogs || []);

      return {
        totalGas: parseInt(trace.gas || "0", 16),
        functionBreakdown,
        opcodeStats,
        suggestions,
      };
    } catch (error: any) {
      console.error("[TraceService] Gas profiling not available:", error.message);

      // Fallback: try to get basic function breakdown from call trace only
      try {
        const callTrace = await this.getTransactionTrace(txHash);
        const functionBreakdown = this.analyzeFunctionCalls(callTrace.calls);

        return {
          totalGas: parseInt(callTrace.gasUsed || "0", 16),
          functionBreakdown,
          opcodeStats: [],
          suggestions: [],
        };
      } catch (fallbackError) {
        console.error("[TraceService] Fallback gas profiling failed:", fallbackError);
        throw new Error("Gas profiling not available on this RPC endpoint. Please use a provider that supports debug APIs.");
      }
    }
  }

  /**
   * Analyze opcode usage from trace
   */
  private analyzeOpcodes(structLogs: any[]): OpcodeStats[] {
    const opcodeMap = new Map<string, { count: number; totalGas: number }>();

    for (const log of structLogs) {
      const opcode = log.op || "UNKNOWN";
      const gasCost = log.gasCost || 0;

      if (!opcodeMap.has(opcode)) {
        opcodeMap.set(opcode, { count: 0, totalGas: 0 });
      }

      const stats = opcodeMap.get(opcode)!;
      stats.count++;
      stats.totalGas += gasCost;
    }

    // Convert to array and calculate averages
    const opcodeStats: OpcodeStats[] = [];
    for (const [opcode, stats] of opcodeMap.entries()) {
      opcodeStats.push({
        opcode,
        count: stats.count,
        totalGas: stats.totalGas,
        avgGas: stats.count > 0 ? stats.totalGas / stats.count : 0,
      });
    }

    // Sort by total gas descending
    return opcodeStats.sort((a, b) => b.totalGas - a.totalGas);
  }

  /**
   * Analyze function calls for gas breakdown
   */
  private analyzeFunctionCalls(calls: TraceCall[]): FunctionGasUsage[] {
    const functionMap = new Map<string, { gasUsed: number; count: number }>();

    const processCalls = (calls: TraceCall[]) => {
      for (const call of calls) {
        const selector = call.input?.slice(0, 10) || "0x";
        const gasUsed = parseInt(call.gasUsed || "0x0", 16);

        if (!functionMap.has(selector)) {
          functionMap.set(selector, { gasUsed: 0, count: 0 });
        }

        const stats = functionMap.get(selector)!;
        stats.gasUsed += gasUsed;
        stats.count++;

        // Recursively process nested calls
        if (call.calls) {
          processCalls(call.calls);
        }
      }
    };

    processCalls(calls);

    // Convert to array
    const functionBreakdown: FunctionGasUsage[] = [];
    for (const [selector, stats] of functionMap.entries()) {
      functionBreakdown.push({
        selector,
        gasUsed: stats.gasUsed,
        callCount: stats.count,
        avgGas: stats.count > 0 ? stats.gasUsed / stats.count : 0,
      });
    }

    // Sort by gas used descending
    return functionBreakdown.sort((a, b) => b.gasUsed - a.gasUsed);
  }

  /**
   * Generate optimization suggestions based on gas analysis
   */
  private generateOptimizationSuggestions(
    opcodeStats: OpcodeStats[],
    functionBreakdown: FunctionGasUsage[],
    structLogs: any[]
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Check for expensive storage operations
    const sstoreStats = opcodeStats.find(s => s.opcode === "SSTORE");
    if (sstoreStats && sstoreStats.count > 10) {
      suggestions.push({
        severity: "high",
        category: "Storage",
        title: "High number of storage writes (SSTORE)",
        description: `Found ${sstoreStats.count} SSTORE operations consuming ${sstoreStats.totalGas} gas. Consider using memory for temporary values or batch updates.`,
        gasImpact: sstoreStats.totalGas,
      });
    }

    // Check for expensive storage reads
    const sloadStats = opcodeStats.find(s => s.opcode === "SLOAD");
    if (sloadStats && sloadStats.count > 20) {
      suggestions.push({
        severity: "medium",
        category: "Storage",
        title: "High number of storage reads (SLOAD)",
        description: `Found ${sloadStats.count} SLOAD operations. Consider caching frequently accessed storage variables in memory.`,
        gasImpact: sloadStats.totalGas,
      });
    }

    // Check for SHA3/KECCAK256 usage
    const sha3Stats = opcodeStats.find(s => s.opcode === "SHA3" || s.opcode === "KECCAK256");
    if (sha3Stats && sha3Stats.count > 15) {
      suggestions.push({
        severity: "medium",
        category: "Hashing",
        title: "Frequent hashing operations",
        description: `Found ${sha3Stats.count} hashing operations. Consider caching hash results when possible.`,
        gasImpact: sha3Stats.totalGas,
      });
    }

    // Check for expensive LOG operations
    const logOps = opcodeStats.filter(s => s.opcode.startsWith("LOG"));
    const totalLogGas = logOps.reduce((sum, op) => sum + op.totalGas, 0);
    const totalLogCount = logOps.reduce((sum, op) => sum + op.count, 0);
    if (totalLogCount > 10) {
      suggestions.push({
        severity: "low",
        category: "Events",
        title: "Multiple event emissions",
        description: `Found ${totalLogCount} LOG operations. Events are necessary for off-chain tracking, but consider if all are essential.`,
        gasImpact: totalLogGas,
      });
    }

    // Check for CALL operations (external calls)
    const callStats = opcodeStats.find(s => s.opcode === "CALL");
    if (callStats && callStats.count > 5) {
      suggestions.push({
        severity: "medium",
        category: "External Calls",
        title: "Multiple external calls",
        description: `Found ${callStats.count} external CALL operations. Each external call has overhead. Consider batching or reducing calls.`,
        gasImpact: callStats.totalGas,
      });
    }

    // Check for expensive operations in loops
    const duplicateOps = this.detectPotentialLoops(structLogs);
    if (duplicateOps.length > 0) {
      for (const op of duplicateOps) {
        suggestions.push({
          severity: "high",
          category: "Loops",
          title: `Potential expensive loop with ${op.opcode}`,
          description: `Detected ${op.count} consecutive ${op.opcode} operations, possibly in a loop. This consumed ${op.totalGas} gas. Consider optimizing loop logic or using more efficient data structures.`,
          gasImpact: op.totalGas,
        });
      }
    }

    // Sort by severity and gas impact
    return suggestions.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return (b.gasImpact || 0) - (a.gasImpact || 0);
    });
  }

  /**
   * Detect potential loops with expensive operations
   */
  private detectPotentialLoops(structLogs: any[]): { opcode: string; count: number; totalGas: number }[] {
    const expensiveOps = ["SSTORE", "SLOAD", "CALL", "DELEGATECALL", "STATICCALL"];
    const detected: { opcode: string; count: number; totalGas: number }[] = [];

    for (const expensiveOp of expensiveOps) {
      let consecutiveCount = 0;
      let consecutiveGas = 0;
      let maxConsecutive = 0;
      let maxConsecutiveGas = 0;

      for (let i = 0; i < structLogs.length; i++) {
        if (structLogs[i].op === expensiveOp) {
          consecutiveCount++;
          consecutiveGas += structLogs[i].gasCost || 0;

          // Check if we hit a pattern (e.g., SSTORE appears many times with similar patterns)
          if (consecutiveCount > maxConsecutive) {
            maxConsecutive = consecutiveCount;
            maxConsecutiveGas = consecutiveGas;
          }
        } else {
          // Reset if we see a different operation
          if (consecutiveCount > 5) {
            // Only report if we saw the operation more than 5 times in a row
            if (maxConsecutive > 5) {
              detected.push({
                opcode: expensiveOp,
                count: maxConsecutive,
                totalGas: maxConsecutiveGas,
              });
            }
          }
          consecutiveCount = 0;
          consecutiveGas = 0;
        }
      }

      // Check final sequence
      if (consecutiveCount > 5 && maxConsecutive > 5) {
        detected.push({
          opcode: expensiveOp,
          count: maxConsecutive,
          totalGas: maxConsecutiveGas,
        });
      }
    }

    return detected;
  }

  /**
   * Extract token transfers from event logs
   */
  extractTokenTransfers(logs: any[]): TokenTransfer[] {
    const transfers: TokenTransfer[] = [];

    // ERC-20/721 Transfer event signature
    const TRANSFER_SIGNATURE = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

    // ERC-1155 TransferSingle event signature
    const TRANSFER_SINGLE_SIGNATURE = "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62";

    // ERC-1155 TransferBatch event signature
    const TRANSFER_BATCH_SIGNATURE = "0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb";

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      if (!log.topics || log.topics.length === 0) continue;

      const signature = log.topics[0];

      // ERC-20 or ERC-721 Transfer
      if (signature === TRANSFER_SIGNATURE && log.topics.length === 3) {
        const from = "0x" + log.topics[1].slice(26);
        const to = "0x" + log.topics[2].slice(26);

        // Try to determine if it's ERC-20 or ERC-721
        // ERC-721 has tokenId in topics, ERC-20 has value in data
        let type: "ERC20" | "ERC721" = "ERC20";
        let tokenId: string | undefined;
        let value: string | undefined;

        if (log.data && log.data !== "0x") {
          // Data exists, likely ERC-20 (value in data)
          value = log.data;
          type = "ERC20";
        } else if (log.topics.length === 4) {
          // tokenId in topic[3], ERC-721
          tokenId = log.topics[3];
          type = "ERC721";
        }

        transfers.push({
          type,
          tokenAddress: log.address.toLowerCase(),
          from: from.toLowerCase(),
          to: to.toLowerCase(),
          tokenId,
          value,
          logIndex: i,
        });
      }
      // ERC-1155 TransferSingle
      else if (signature === TRANSFER_SINGLE_SIGNATURE) {
        if (log.topics.length >= 4) {
          const operator = "0x" + log.topics[1].slice(26);
          const from = "0x" + log.topics[2].slice(26);
          const to = "0x" + log.topics[3].slice(26);

          // id and value are in data
          if (log.data && log.data.length >= 130) {
            const tokenId = "0x" + log.data.slice(2, 66);
            const amount = "0x" + log.data.slice(66, 130);

            transfers.push({
              type: "ERC1155",
              tokenAddress: log.address.toLowerCase(),
              from: from.toLowerCase(),
              to: to.toLowerCase(),
              tokenId,
              amount,
              logIndex: i,
            });
          }
        }
      }
      // ERC-1155 TransferBatch
      else if (signature === TRANSFER_BATCH_SIGNATURE) {
        if (log.topics.length >= 4) {
          const operator = "0x" + log.topics[1].slice(26);
          const from = "0x" + log.topics[2].slice(26);
          const to = "0x" + log.topics[3].slice(26);

          // ids and values are in data (arrays)
          // For simplicity, we'll just note that it's a batch transfer
          transfers.push({
            type: "ERC1155",
            tokenAddress: log.address.toLowerCase(),
            from: from.toLowerCase(),
            to: to.toLowerCase(),
            tokenId: "batch",
            amount: "multiple",
            logIndex: i,
          });
        }
      }
    }

    return transfers;
  }
}

export const traceService = new TraceService();
