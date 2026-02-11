"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useLatestBlock, useBlock } from "@/hooks/useEtherscan";
import { useNavigateTab } from "@/hooks/useNavigateTab";
import { hexToNumber, formatGas, formatEth, truncateAddress } from "@/lib/utils";
import type { EthTransaction } from "@/lib/types";

// Get transaction type info
const getTxTypeInfo = (tx: EthTransaction) => {
  const type = tx.type || "0x0";
  const typeNum = parseInt(type, 16);

  const typeInfo: Record<number, { label: string; color: string; desc: string }> = {
    0: {
      label: "Legacy",
      color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      desc: "Traditional transaction with fixed gasPrice"
    },
    1: {
      label: "EIP-2930",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      desc: "Transaction with pre-declared access list"
    },
    2: {
      label: "EIP-1559",
      color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      desc: "Dynamic fee transaction (most common)"
    },
    3: {
      label: "EIP-4844",
      color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      desc: "Blob transaction for L2 data"
    }
  };

  return typeInfo[typeNum] || typeInfo[0];
};

export default function BlockExplorer({ initialBlockNumber }: { initialBlockNumber?: string }) {
  const [blockInput, setBlockInput] = useState("");
  const [selectedBlock, setSelectedBlock] = useState<string | null>(initialBlockNumber || null);
  const [txPage, setTxPage] = useState(0);
  const TX_PER_PAGE = 20;

  const { data: latestHex } = useLatestBlock();
  const latestNum = latestHex ? hexToNumber(latestHex) : null;

  // Auto-select latest block on first load
  useEffect(() => {
    if (latestNum && !selectedBlock) {
      setSelectedBlock(String(latestNum));
    }
  }, [latestNum, selectedBlock]);

  const { data: block, isLoading, error } = useBlock(selectedBlock);
  const nav = useNavigateTab();

  const currentNum = selectedBlock ? parseInt(selectedBlock) : null;

  function goToBlock(num: number) {
    setSelectedBlock(String(num));
    setBlockInput("");
    setTxPage(0);
  }

  function handleGoTo(e: React.FormEvent) {
    e.preventDefault();
    const num = parseInt(blockInput);
    if (!isNaN(num) && num >= 0) goToBlock(num);
  }

  const transactions = block?.transactions as (EthTransaction | string)[] | undefined;
  const totalTxs = transactions?.length ?? 0;
  const totalPages = Math.ceil(totalTxs / TX_PER_PAGE);
  const txList = transactions?.slice(txPage * TX_PER_PAGE, (txPage + 1) * TX_PER_PAGE);

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
              disabled={!currentNum || currentNum <= 0}
              onClick={() => currentNum && goToBlock(currentNum - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev
            </button>
            <button
              className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
              disabled={!currentNum || !latestNum || currentNum >= latestNum}
              onClick={() => currentNum && goToBlock(currentNum + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
            {latestNum && (
              <button
                className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-accent"
                onClick={() => goToBlock(latestNum)}
              >
                Latest ({latestNum})
              </button>
            )}
            <form onSubmit={handleGoTo} className="flex gap-2 ml-auto">
              <input
                type="number"
                placeholder="Go to block #"
                className="w-40 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={blockInput}
                onChange={(e) => setBlockInput(e.target.value)}
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                disabled={!blockInput}
              >
                Go
              </button>
            </form>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading block data...
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            Error: {(error as Error).message}
          </CardContent>
        </Card>
      )}

      {block && (
        <>
          {/* Block Detail */}
          <Card>
            <CardHeader>
              <CardTitle>Block #{hexToNumber(block.number)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm">
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <span className="text-muted-foreground">Block Hash</span>
                  <span className="font-mono break-all">{block.hash}</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <span className="text-muted-foreground">Timestamp</span>
                  <span>{new Date(hexToNumber(block.timestamp) * 1000).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <span className="text-muted-foreground">Miner</span>
                  <span className="font-mono break-all">{block.miner}</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <span className="text-muted-foreground">Gas Used</span>
                  <span className="font-mono">
                    {formatGas(hexToNumber(block.gasUsed))} / {formatGas(hexToNumber(block.gasLimit))}
                  </span>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <span className="text-muted-foreground">Transactions</span>
                  <span>{block.transactions?.length ?? 0}</span>
                </div>
                {block.baseFeePerGas && (
                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <span className="text-muted-foreground">Base Fee</span>
                    <span className="font-mono">
                      {(hexToNumber(block.baseFeePerGas) / 1e9).toFixed(2)} Gwei
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Transaction table */}
          {totalTxs > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Transactions ({totalTxs})
                  </CardTitle>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        className="inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                        disabled={txPage === 0}
                        onClick={() => setTxPage(0)}
                      >
                        First
                      </button>
                      <button
                        className="inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                        disabled={txPage === 0}
                        onClick={() => setTxPage(p => p - 1)}
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </button>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {txPage + 1} / {totalPages}
                      </span>
                      <button
                        className="inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                        disabled={txPage >= totalPages - 1}
                        onClick={() => setTxPage(p => p + 1)}
                      >
                        <ChevronRight className="h-3 w-3" />
                      </button>
                      <button
                        className="inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                        disabled={txPage >= totalPages - 1}
                        onClick={() => setTxPage(totalPages - 1)}
                      >
                        Last
                      </button>
                    </div>
                  )}
                </div>
                {totalPages > 1 && (
                  <div className="text-xs text-muted-foreground">
                    Showing {txPage * TX_PER_PAGE + 1}–{Math.min((txPage + 1) * TX_PER_PAGE, totalTxs)} of {totalTxs}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-3">#</th>
                        <th className="text-left py-2 pr-3">Tx Hash</th>
                        <th className="text-left py-2 pr-3">Type</th>
                        <th className="text-left py-2 pr-3">From</th>
                        <th className="text-left py-2 pr-3">To</th>
                        <th className="text-right py-2 pr-3">Value</th>
                        <th className="text-right py-2">Gas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txList?.map((txItem, i) => {
                        const rowNum = txPage * TX_PER_PAGE + i + 1;
                        if (typeof txItem === "string") {
                          return (
                            <tr key={i} className="border-b hover:bg-muted/50">
                              <td className="py-2 pr-3 text-muted-foreground">{rowNum}</td>
                              <td colSpan={6} className="py-2">
                                <button
                                  className="font-mono text-primary hover:underline"
                                  onClick={() => {
                                    nav.setTxHash(txItem);
                                    nav.setActiveTab("tx");
                                  }}
                                >
                                  {truncateAddress(txItem, 10, 8)}
                                </button>
                              </td>
                            </tr>
                          );
                        }
                        const t = txItem as EthTransaction;
                        const txTypeInfo = getTxTypeInfo(t);
                        return (
                          <tr key={i} className="border-b hover:bg-muted/50">
                            <td className="py-2 pr-3 text-muted-foreground">{rowNum}</td>
                            <td className="py-2 pr-3">
                              <button
                                className="font-mono text-primary hover:underline"
                                onClick={() => {
                                  nav.setTxHash(t.hash);
                                  nav.setActiveTab("tx");
                                }}
                              >
                                {truncateAddress(t.hash, 10, 8)}
                              </button>
                            </td>
                            <td className="py-2 pr-3">
                              <Badge className={`text-[10px] ${txTypeInfo.color}`}>
                                {txTypeInfo.label}
                              </Badge>
                            </td>
                            <td className="py-2 pr-3 font-mono">{truncateAddress(t.from)}</td>
                            <td className="py-2 pr-3 font-mono">{t.to ? truncateAddress(t.to) : "Create"}</td>
                            <td className="py-2 pr-3 text-right font-mono">{formatEth(t.value, 4)}</td>
                            <td className="py-2 text-right font-mono">{formatGas(hexToNumber(t.gas))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bottom pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-xs text-muted-foreground">
                      {txPage * TX_PER_PAGE + 1}–{Math.min((txPage + 1) * TX_PER_PAGE, totalTxs)} of {totalTxs} transactions
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        className="inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                        disabled={txPage === 0}
                        onClick={() => setTxPage(p => p - 1)}
                      >
                        <ChevronLeft className="h-3 w-3 mr-1" />
                        Prev
                      </button>
                      <button
                        className="inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                        disabled={txPage >= totalPages - 1}
                        onClick={() => setTxPage(p => p + 1)}
                      >
                        Next
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
