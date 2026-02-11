"use client";

import { useState } from "react";
import { Search, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useTransaction, useTransactionReceipt } from "@/hooks/useEtherscan";
import { useNavigateTab } from "@/hooks/useNavigateTab";
import { hexToNumber, formatEth, gweiFromWei, formatGas, truncateAddress } from "@/lib/utils";
import TransactionTrace from "./TransactionTrace";

export default function TransactionLookup({ initialHash }: { initialHash?: string }) {
  const [input, setInput] = useState(initialHash || "");
  const [searchHash, setSearchHash] = useState<string | null>(initialHash || null);
  const [showInput, setShowInput] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const { data: tx, isLoading: txLoading, error: txError } = useTransaction(searchHash);
  const { data: receipt, isLoading: receiptLoading } = useTransactionReceipt(searchHash);
  const nav = useNavigateTab();

  // Get transaction type info
  const getTxTypeInfo = (tx: any) => {
    const type = tx.type || "0x0";
    const typeNum = parseInt(type, 16);

    const typeInfo: Record<number, { label: string; color: string; desc: string }> = {
      0: {
        label: "Legacy",
        color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
        desc: "Traditional transaction with fixed gasPrice"
      },
      1: {
        label: "Access List (EIP-2930)",
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        desc: "Transaction with pre-declared access list"
      },
      2: {
        label: "EIP-1559",
        color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        desc: "Dynamic fee transaction (most common)"
      },
      3: {
        label: "Blob (EIP-4844)",
        color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
        desc: "Blob transaction for L2 data"
      }
    };

    return typeInfo[typeNum] || typeInfo[0];
  };

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed) setSearchHash(trimmed);
  }

  const isLoading = txLoading || receiptLoading;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter transaction hash (0x...)"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              disabled={isLoading || !input.trim()}
            >
              <Search className="mr-2 h-4 w-4" />
              Search
            </button>
          </form>
        </CardContent>
      </Card>

      {isLoading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading transaction data...
          </CardContent>
        </Card>
      )}

      {txError && (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            Error: {(txError as Error).message}
          </CardContent>
        </Card>
      )}

      {tx && (
        <>
          {/* Transaction Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Transaction Overview
                {receipt && (
                  <Badge variant={receipt.status === "0x1" ? "success" : "destructive"}>
                    {receipt.status === "0x1" ? "Success" : "Failed"}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm">
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <span className="text-muted-foreground">Tx Hash</span>
                  <span className="font-mono break-all">{tx.hash}</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <span className="text-muted-foreground">Type</span>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${getTxTypeInfo(tx).color}`}>
                      Type {parseInt(tx.type || "0x0", 16)}: {getTxTypeInfo(tx).label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {getTxTypeInfo(tx).desc}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <span className="text-muted-foreground">Block</span>
                  <button
                    className="text-left text-primary hover:underline font-mono"
                    onClick={() => {
                      nav.setBlockNumber(String(hexToNumber(tx.blockNumber)));
                      nav.setActiveTab("blocks");
                    }}
                  >
                    {hexToNumber(tx.blockNumber)}
                  </button>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <span className="text-muted-foreground">From</span>
                  <span className="font-mono break-all">{tx.from}</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <span className="text-muted-foreground">To</span>
                  <span className="font-mono break-all flex items-center gap-1">
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    {tx.to ? (
                      <button
                        className="text-primary hover:underline"
                        onClick={() => {
                          nav.setContractAddress(tx.to!);
                          nav.setActiveTab("contract");
                        }}
                      >
                        {tx.to}
                      </button>
                    ) : (
                      <span className="italic text-muted-foreground">Contract Creation</span>
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <span className="text-muted-foreground">Value</span>
                  <span className="font-mono">{formatEth(tx.value)}</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <span className="text-muted-foreground">Gas Limit</span>
                  <span className="font-mono">{formatGas(hexToNumber(tx.gas))}</span>
                </div>
                {receipt && (
                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <span className="text-muted-foreground">Gas Used</span>
                    <span className="font-mono">{formatGas(hexToNumber(receipt.gasUsed))}</span>
                  </div>
                )}
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <span className="text-muted-foreground">Gas Price</span>
                  <span className="font-mono">{gweiFromWei(tx.gasPrice)} Gwei</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <span className="text-muted-foreground">Nonce</span>
                  <span className="font-mono">{hexToNumber(tx.nonce)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Input Data */}
          {tx.input && tx.input !== "0x" && (
            <Card>
              <CardHeader
                className="cursor-pointer"
                onClick={() => setShowInput(!showInput)}
              >
                <CardTitle className="flex items-center gap-2 text-base">
                  Input Data
                  {showInput ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
              {showInput && (
                <CardContent>
                  <pre className="overflow-x-auto rounded bg-muted p-3 text-xs font-mono break-all whitespace-pre-wrap">
                    {tx.input}
                  </pre>
                </CardContent>
              )}
            </Card>
          )}

          {/* Event Logs */}
          {receipt && receipt.logs && receipt.logs.length > 0 && (
            <Card>
              <CardHeader
                className="cursor-pointer"
                onClick={() => setShowLogs(!showLogs)}
              >
                <CardTitle className="flex items-center gap-2 text-base">
                  Event Logs ({receipt.logs.length})
                  {showLogs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
              {showLogs && (
                <CardContent className="space-y-3">
                  {receipt.logs.map((log, i) => (
                    <div key={i} className="rounded border p-3 text-xs space-y-1">
                      <div className="grid grid-cols-[80px_1fr] gap-1">
                        <span className="text-muted-foreground">Address</span>
                        <span className="font-mono break-all">{log.address}</span>
                      </div>
                      {log.topics && log.topics.map((topic, j) => (
                        <div key={j} className="grid grid-cols-[80px_1fr] gap-1">
                          <span className="text-muted-foreground">Topic {j}</span>
                          <span className="font-mono break-all">{topic}</span>
                        </div>
                      ))}
                      {log.data && log.data !== "0x" && (
                        <div className="grid grid-cols-[80px_1fr] gap-1">
                          <span className="text-muted-foreground">Data</span>
                          <span className="font-mono break-all">{log.data}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          )}

          {/* Transaction Trace */}
          {searchHash && (
            <TransactionTrace txHash={searchHash} />
          )}
        </>
      )}
    </div>
  );
}
