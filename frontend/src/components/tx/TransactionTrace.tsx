"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, AlertCircle, CheckCircle, ArrowRight, Zap, Database, Coins, ArrowRightLeft, Gauge, Code, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { TraceCall, InternalTransaction, DecodedLog, StateDiff, BalanceChange, StorageChange, TokenTransfer, GasProfile } from "@/lib/types";
import { apiClient } from "@/lib/api/client";

interface CallTreeNodeProps {
  call: TraceCall;
  onSelect?: (call: TraceCall) => void;
  selected?: boolean;
}

function CallTreeNode({ call, onSelect, selected }: CallTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = call.calls && call.calls.length > 0;

  const getCallTypeColor = (type: string) => {
    switch (type.toUpperCase()) {
      case "CALL":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "DELEGATECALL":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "STATICCALL":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "CREATE":
      case "CREATE2":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatGas = (hex: string) => {
    try {
      return parseInt(hex, 16).toLocaleString();
    } catch {
      return hex;
    }
  };

  const formatValue = (hex: string) => {
    try {
      const value = BigInt(hex);
      if (value === 0n) return "0 ETH";
      const eth = Number(value) / 1e18;
      return `${eth.toFixed(6)} ETH`;
    } catch {
      return hex;
    }
  };

  const truncateAddress = (addr: string) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className={`ml-${call.depth * 4}`}>
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-md cursor-pointer hover:bg-accent/50 transition-colors ${
          selected ? "bg-accent" : ""
        }`}
        onClick={() => onSelect?.(call)}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="hover:bg-accent rounded p-1"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-6" />}

        <Badge className={`text-[10px] ${getCallTypeColor(call.type)}`}>
          {call.type}
        </Badge>

        <span className="font-mono text-xs">{truncateAddress(call.from)}</span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className="font-mono text-xs">{truncateAddress(call.to)}</span>

        {call.value !== "0x0" && call.value !== "0x" && (
          <span className="text-xs text-green-600 dark:text-green-400 font-semibold">
            {formatValue(call.value)}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            Gas: {formatGas(call.gasUsed)} / {formatGas(call.gas)}
          </span>
          {call.error ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="ml-4 border-l-2 border-border/50 pl-2">
          {call.calls!.map((childCall, idx) => (
            <CallTreeNode
              key={idx}
              call={childCall}
              onSelect={onSelect}
              selected={selected}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TransactionTrace({ txHash }: { txHash: string }) {
  const [trace, setTrace] = useState<any>(null);
  const [internals, setInternals] = useState<InternalTransaction[]>([]);
  const [logs, setLogs] = useState<DecodedLog[]>([]);
  const [stateDiff, setStateDiff] = useState<StateDiff | null>(null);
  const [gasProfile, setGasProfile] = useState<GasProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rpcWarning, setRpcWarning] = useState<string | null>(null);
  const [stateDiffWarning, setStateDiffWarning] = useState<string | null>(null);
  const [gasProfileWarning, setGasProfileWarning] = useState<string | null>(null);
  const [selectedCall, setSelectedCall] = useState<TraceCall | null>(null);
  const [activeTab, setActiveTab] = useState<"callstack" | "internal" | "logs" | "balance" | "tokens">("internal");

  useEffect(() => {
    if (txHash) {
      loadTrace();
    }
  }, [txHash]);

  const loadTrace = async () => {
    setLoading(true);
    setError(null);
    setRpcWarning(null);
    setStateDiffWarning(null);
    setGasProfileWarning(null);

    try {
      // Load all trace data in parallel
      const [traceRes, internalsRes, logsRes, stateDiffRes, gasProfileRes] = await Promise.all([
        apiClient.getTransactionTrace(txHash),
        apiClient.getInternalTransactions(txHash),
        apiClient.getDecodedLogs(txHash),
        apiClient.getStateDiff(txHash),
        apiClient.getGasProfile(txHash),
      ]);

      // Handle trace result (may not be available on free RPC)
      if (traceRes.ok) {
        setTrace(traceRes.trace);
      } else if ((traceRes as any).errorType === "RPC_NOT_SUPPORTED" || traceRes.error?.includes("not available") || traceRes.error?.includes("requires a paid")) {
        // RPC doesn't support debug API, but we can still show internals and logs
        setRpcWarning("Call Stack requires a paid RPC endpoint (Alchemy/Infura Pro). Showing internal transactions and event logs via Etherscan API.");
        setActiveTab("internal"); // Switch to internal tab by default
      } else if (traceRes.error) {
        console.error("[TransactionTrace] Trace error:", traceRes.error);
      }

      if (internalsRes.ok) {
        setInternals(internalsRes.internals || []);
      }

      if (logsRes.ok) {
        setLogs(logsRes.logs || []);
      }

      // Handle state diff result
      if (stateDiffRes.ok && stateDiffRes.stateDiff) {
        setStateDiff(stateDiffRes.stateDiff);
        if (stateDiffRes.warning) {
          setStateDiffWarning(stateDiffRes.warning);
        }
      }

      // Handle gas profile result
      if (gasProfileRes.ok && gasProfileRes.gasProfile) {
        setGasProfile(gasProfileRes.gasProfile);
      } else if (gasProfileRes.errorType === "RPC_NOT_SUPPORTED" || gasProfileRes.error?.includes("not available")) {
        setGasProfileWarning("Gas profiling requires a paid RPC endpoint with debug API support.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load transaction trace");
    } finally {
      setLoading(false);
    }
  };

  const truncateAddress = (addr: string) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatValue = (hex: string) => {
    try {
      const value = BigInt(hex);
      if (value === 0n) return "0 ETH";
      const eth = Number(value) / 1e18;
      return `${eth.toFixed(6)} ETH`;
    } catch {
      return hex;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading transaction trace...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-destructive">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show component even if trace is not available (for internals and logs)
  const hasData = trace || internals.length > 0 || logs.length > 0;

  if (!hasData) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* RPC Warning */}
      {rpcWarning && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Limited Trace Data:</strong> {rpcWarning}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto">
        {trace && (
          <button
            onClick={() => setActiveTab("callstack")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "callstack"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Call Stack
          </button>
        )}
        <button
          onClick={() => setActiveTab("internal")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "internal"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Internal Txs ({internals.length})
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "logs"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Event Logs ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab("balance")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "balance"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-1">
            <Coins className="h-3 w-3" />
            Balance Changes ({stateDiff?.balanceChanges.length || 0})
          </span>
        </button>
        <button
          onClick={() => setActiveTab("tokens")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "tokens"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-1">
            <ArrowRightLeft className="h-3 w-3" />
            Token Transfers ({stateDiff?.tokenTransfers.length || 0})
          </span>
        </button>
      </div>

      {/* Call Stack Tab */}
      {activeTab === "callstack" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Call Stack Trace
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {trace.calls && trace.calls.map((call: TraceCall, idx: number) => (
                <CallTreeNode
                  key={idx}
                  call={call}
                  onSelect={setSelectedCall}
                  selected={selectedCall === call}
                />
              ))}
            </div>

            {selectedCall && (
              <div className="mt-4 p-4 bg-muted rounded-md">
                <h4 className="font-semibold mb-2">Call Details</h4>
                <div className="space-y-2 text-sm font-mono">
                  <div><span className="text-muted-foreground">Type:</span> {selectedCall.type}</div>
                  <div><span className="text-muted-foreground">From:</span> {selectedCall.from}</div>
                  <div><span className="text-muted-foreground">To:</span> {selectedCall.to}</div>
                  <div><span className="text-muted-foreground">Value:</span> {formatValue(selectedCall.value)}</div>
                  <div><span className="text-muted-foreground">Input:</span> <span className="break-all text-[10px]">{selectedCall.input}</span></div>
                  {selectedCall.output && (
                    <div><span className="text-muted-foreground">Output:</span> <span className="break-all text-[10px]">{selectedCall.output}</span></div>
                  )}
                  {selectedCall.error && (
                    <div className="text-red-500"><span className="text-muted-foreground">Error:</span> {selectedCall.error}</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Internal Transactions Tab */}
      {activeTab === "internal" && (
        <Card>
          <CardHeader>
            <CardTitle>Internal Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {internals.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No internal transactions</p>
            ) : (
              <div className="space-y-2">
                {internals.map((tx, idx) => (
                  <div key={idx} className="border rounded-md p-3 text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="text-[10px]">{tx.type}</Badge>
                      <span className="text-muted-foreground">#{tx.index}</span>
                      <span className="text-muted-foreground">Depth: {tx.depth}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span>{truncateAddress(tx.from)}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span>{truncateAddress(tx.to)}</span>
                      {tx.value !== "0x0" && (
                        <span className="text-green-600 dark:text-green-400">{formatValue(tx.value)}</span>
                      )}
                    </div>
                    {tx.error && (
                      <div className="mt-2 text-red-500 text-xs">Error: {tx.error}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Event Logs Tab */}
      {activeTab === "logs" && (
        <Card>
          <CardHeader>
            <CardTitle>Event Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No event logs</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log, idx) => (
                  <div key={idx} className="border rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs">{truncateAddress(log.address)}</span>
                      {log.eventName && (
                        <Badge className="text-xs">{log.eventName}</Badge>
                      )}
                    </div>
                    {log.args && (
                      <div className="space-y-1 text-sm">
                        {Object.entries(log.args).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <span className="text-muted-foreground min-w-[100px]">{key}:</span>
                            <span className="font-mono text-xs break-all">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {!log.eventName && log.signature && (
                      <div className="text-xs text-muted-foreground font-mono">
                        Signature: {log.signature}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Balance Changes Tab */}
      {activeTab === "balance" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Balance Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stateDiffWarning && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">{stateDiffWarning}</p>
                </div>
              </div>
            )}
            {!stateDiff || stateDiff.balanceChanges.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No balance changes</p>
            ) : (
              <div className="space-y-3">
                {stateDiff.balanceChanges.map((change, idx) => {
                  const beforeEth = Number(BigInt(change.before)) / 1e18;
                  const afterEth = Number(BigInt(change.after)) / 1e18;
                  const deltaEth = Number(BigInt(change.delta)) / 1e18;
                  const isIncrease = deltaEth > 0;

                  return (
                    <div key={idx} className="border rounded-md p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs">{truncateAddress(change.address)}</span>
                        <Badge className={isIncrease ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {isIncrease ? "+" : ""}{deltaEth.toFixed(6)} ETH
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Before: </span>
                          <span className="font-mono">{beforeEth.toFixed(6)} ETH</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">After: </span>
                          <span className="font-mono">{afterEth.toFixed(6)} ETH</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Token Transfers Tab */}
      {activeTab === "tokens" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Token Transfers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stateDiff || stateDiff.tokenTransfers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No token transfers</p>
            ) : (
              <div className="space-y-3">
                {stateDiff.tokenTransfers.map((transfer, idx) => {
                  const getTypeColor = (type: string) => {
                    switch (type) {
                      case "ERC20":
                        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
                      case "ERC721":
                        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
                      case "ERC1155":
                        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
                      default:
                        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
                    }
                  };

                  const formatTokenValue = (transfer: TokenTransfer) => {
                    if (transfer.type === "ERC721") {
                      return `Token ID: ${transfer.tokenId}`;
                    }
                    if (transfer.type === "ERC1155") {
                      if (transfer.tokenId === "batch") {
                        return "Batch Transfer";
                      }
                      return `ID: ${transfer.tokenId}, Amount: ${transfer.amount}`;
                    }
                    if (transfer.value) {
                      try {
                        const value = BigInt(transfer.value);
                        return (Number(value) / 1e18).toFixed(6);
                      } catch {
                        return transfer.value;
                      }
                    }
                    return "N/A";
                  };

                  return (
                    <div key={idx} className="border rounded-md p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={`text-xs ${getTypeColor(transfer.type)}`}>
                          {transfer.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Log #{transfer.logIndex}</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Token: </span>
                          <span className="font-mono text-xs">{truncateAddress(transfer.tokenAddress)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{truncateAddress(transfer.from)}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono text-xs">{truncateAddress(transfer.to)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Value: </span>
                          <span className="font-mono text-xs">{formatTokenValue(transfer)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
