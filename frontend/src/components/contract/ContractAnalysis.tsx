"use client";

import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronUp, ExternalLink, Clock, Loader2, CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useContractInfo } from "@/hooks/useEtherscan";
import { useNavigateTab } from "@/hooks/useNavigateTab";
import { formatEth, truncateAddress } from "@/lib/utils";
import { apiClient } from "@/lib/api/client";
import { wsClient } from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";
import type { WsMessage, Finding } from "@/lib/types";

interface AbiItem {
  type: string;
  name?: string;
  inputs?: { name: string; type: string; indexed?: boolean }[];
  outputs?: { name: string; type: string }[];
  stateMutability?: string;
}

export default function ContractAnalysis({ initialAddress }: { initialAddress?: string }) {
  const [input, setInput] = useState(initialAddress || "");
  const [searchAddress, setSearchAddress] = useState<string | null>(initialAddress || null);
  const [showSource, setShowSource] = useState(false);
  const [showAbi, setShowAbi] = useState(false);
  const [showTxHistory, setShowTxHistory] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [analysisFindings, setAnalysisFindings] = useState<Finding[]>([]);
  const [analysisReportId, setAnalysisReportId] = useState<string | null>(null);

  const { data: contract, isLoading, error } = useContractInfo(searchAddress);
  const nav = useNavigateTab();

  // Fetch recent transactions for the contract
  const { data: txHistory } = useQuery({
    queryKey: ["contract-txs", searchAddress],
    queryFn: async () => {
      const res = await apiClient.getAccountTransactions(searchAddress!, 1, 20);
      return res.ok ? res.data : [];
    },
    enabled: !!searchAddress,
  });

  const parsedAbi = useMemo<AbiItem[]>(() => {
    if (!contract?.abi || contract.abi === "Contract source code not verified") return [];
    try {
      return JSON.parse(contract.abi);
    } catch {
      return [];
    }
  }, [contract?.abi]);

  const functions = parsedAbi.filter((item) => item.type === "function");
  const events = parsedAbi.filter((item) => item.type === "event");
  const readFunctions = functions.filter(
    (fn) => fn.stateMutability === "view" || fn.stateMutability === "pure"
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed) {
      setSearchAddress(trimmed);
      setAnalysisStatus(null);
    }
  }

  async function runSlither() {
    if (!contract?.sourceCode || !searchAddress) return;

    setAnalysisRunning(true);
    setAnalysisStatus("Submitting source code for analysis...");
    setAnalysisFindings([]);
    setAnalysisReportId(null);

    try {
      const res = await apiClient.analyzeSource({
        sourceCode: contract.sourceCode,
        contractName: contract.name || "Contract",
        contractAddress: searchAddress,
      });

      if (res.ok && res.jobId) {
        setAnalysisStatus("Running Slither analysis...");

        const unsub = wsClient.subscribe(`job:${res.jobId}`, async (msg: WsMessage) => {
          if (msg.type === "job:update") {
            setAnalysisStatus(msg.message);
          } else if (msg.type === "job:done") {
            unsub();
            if (msg.error) {
              setAnalysisStatus(`Error: ${msg.error}`);
              setAnalysisRunning(false);
            } else if (msg.reportId) {
              setAnalysisStatus("Fetching results...");
              setAnalysisReportId(msg.reportId);
              // Fetch the report to show findings inline
              try {
                const report = await apiClient.getReportById(msg.reportId);
                if (report.ok && report.report) {
                  setAnalysisFindings(report.report.findings || []);
                  setAnalysisStatus(`Analysis complete! Found ${report.report.findings?.length || 0} issues.`);
                } else {
                  setAnalysisStatus("Analysis complete! Check Findings tab for details.");
                }
              } catch {
                setAnalysisStatus("Analysis complete! Check Findings tab for details.");
              }
              setAnalysisRunning(false);
            }
          }
        });
      } else {
        setAnalysisStatus(`Failed: ${JSON.stringify(res.error) || "Unknown error"}`);
        setAnalysisRunning(false);
      }
    } catch (err: any) {
      setAnalysisStatus(`Error: ${err.message}`);
      setAnalysisRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter contract address (0x...)"
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
              Lookup
            </button>
          </form>
        </CardContent>
      </Card>

      {isLoading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading contract data...
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

      {contract && (
        <>
          {/* Contract Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {contract.name || "Unknown Contract"}
                  <Badge variant={contract.isVerified ? "success" : "secondary"}>
                    {contract.isVerified ? "✓ Verified" : "Unverified"}
                  </Badge>
                </CardTitle>
                {txHistory && txHistory.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {txHistory.length}+ transactions
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm">
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <span className="text-muted-foreground">Address</span>
                  <span className="font-mono break-all text-xs">{contract.address}</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <span className="text-muted-foreground">Balance</span>
                  <span className="font-mono font-semibold">{formatEth(contract.balance)}</span>
                </div>
                {contract.compiler && (
                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <span className="text-muted-foreground">Compiler</span>
                    <span className="font-mono text-xs">{contract.compiler}</span>
                  </div>
                )}
                {contract.creator && (
                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <span className="text-muted-foreground">Creator</span>
                    <span className="font-mono break-all text-xs">{contract.creator}</span>
                  </div>
                )}
                {contract.creationTxHash && (
                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <span className="text-muted-foreground">Creation Tx</span>
                    <button
                      className="font-mono break-all text-xs text-primary hover:underline text-left flex items-center gap-1"
                      onClick={() => {
                        nav.setTxHash(contract.creationTxHash!);
                        nav.setActiveTab("tx");
                      }}
                    >
                      {contract.creationTxHash}
                      <ExternalLink className="h-3 w-3 inline" />
                    </button>
                  </div>
                )}
                {parsedAbi.length > 0 && (
                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <span className="text-muted-foreground">ABI</span>
                    <span className="text-xs">
                      {functions.length} functions, {events.length} events
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Source Code */}
          {contract.isVerified && contract.sourceCode && (
            <Card>
              <CardHeader
                className="cursor-pointer"
                onClick={() => setShowSource(!showSource)}
              >
                <CardTitle className="flex items-center gap-2 text-base">
                  Source Code
                  {showSource ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </CardTitle>
              </CardHeader>
              {showSource && (
                <CardContent>
                  <pre className="overflow-x-auto rounded bg-muted p-4 text-xs font-mono max-h-[500px] overflow-y-auto whitespace-pre-wrap">
                    {contract.sourceCode}
                  </pre>
                </CardContent>
              )}
            </Card>
          )}

          {/* ABI Explorer */}
          {parsedAbi.length > 0 && (
            <Card>
              <CardHeader
                className="cursor-pointer"
                onClick={() => setShowAbi(!showAbi)}
              >
                <CardTitle className="flex items-center gap-2 text-base">
                  ABI Explorer
                  <Badge variant="outline" className="text-xs">
                    {readFunctions.length} read, {functions.length - readFunctions.length} write, {events.length} events
                  </Badge>
                  {showAbi ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
                </CardTitle>
              </CardHeader>
              {showAbi && (
                <CardContent className="space-y-4">
                  {readFunctions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        Read Functions
                        <Badge variant="outline" className="text-[10px]">
                          {readFunctions.length}
                        </Badge>
                      </h4>
                      <div className="space-y-1">
                        {readFunctions.map((fn, i) => (
                          <div key={i} className="rounded border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900 p-2 text-xs font-mono">
                            <span className="text-blue-600 dark:text-blue-400 font-semibold">{fn.name}</span>
                            ({fn.inputs?.map((inp, j) => (
                              <span key={j}>
                                {j > 0 && ", "}
                                <span className="text-muted-foreground">{inp.type}</span>{" "}
                                {inp.name}
                              </span>
                            ))})
                            {fn.outputs && fn.outputs.length > 0 && (
                              <span className="text-muted-foreground">
                                {" → "}({fn.outputs.map((o, j) => (
                                  <span key={j}>{j > 0 && ", "}{o.type}{o.name ? ` ${o.name}` : ""}</span>
                                ))})
                              </span>
                            )}
                            <Badge variant="outline" className="ml-2 text-[10px] bg-blue-100 dark:bg-blue-900">
                              {fn.stateMutability}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {functions.filter(fn => fn.stateMutability !== "view" && fn.stateMutability !== "pure").length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        Write Functions
                        <Badge variant="outline" className="text-[10px]">
                          {functions.filter(fn => fn.stateMutability !== "view" && fn.stateMutability !== "pure").length}
                        </Badge>
                      </h4>
                      <div className="space-y-1">
                        {functions.filter(fn => fn.stateMutability !== "view" && fn.stateMutability !== "pure").map((fn, i) => (
                          <div key={i} className="rounded border border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900 p-2 text-xs font-mono">
                            <span className="text-orange-600 dark:text-orange-400 font-semibold">{fn.name}</span>
                            ({fn.inputs?.map((inp, j) => (
                              <span key={j}>
                                {j > 0 && ", "}
                                <span className="text-muted-foreground">{inp.type}</span>{" "}
                                {inp.name}
                              </span>
                            ))})
                            {fn.outputs && fn.outputs.length > 0 && (
                              <span className="text-muted-foreground">
                                {" → "}({fn.outputs.map((o, j) => (
                                  <span key={j}>{j > 0 && ", "}{o.type}{o.name ? ` ${o.name}` : ""}</span>
                                ))})
                              </span>
                            )}
                            {fn.stateMutability && (
                              <Badge variant="outline" className="ml-2 text-[10px] bg-orange-100 dark:bg-orange-900">
                                {fn.stateMutability}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {events.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Events</h4>
                      <div className="space-y-1">
                        {events.map((evt, i) => (
                          <div key={i} className="rounded border p-2 text-xs font-mono">
                            <span className="text-primary">{evt.name}</span>
                            ({evt.inputs?.map((inp, j) => (
                              <span key={j}>
                                {j > 0 && ", "}
                                {inp.indexed && <span className="text-yellow-500">indexed </span>}
                                <span className="text-muted-foreground">{inp.type}</span>{" "}
                                {inp.name}
                              </span>
                            ))})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {/* Transaction History */}
          {txHistory && txHistory.length > 0 && (
            <Card>
              <CardHeader
                className="cursor-pointer"
                onClick={() => setShowTxHistory(!showTxHistory)}
              >
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" />
                  Recent Transactions ({txHistory.length})
                  {showTxHistory ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
                </CardTitle>
              </CardHeader>
              {showTxHistory && (
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-3">Tx Hash</th>
                          <th className="text-left py-2 pr-3">From</th>
                          <th className="text-left py-2 pr-3">To</th>
                          <th className="text-right py-2 pr-3">Value</th>
                          <th className="text-right py-2">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {txHistory.slice(0, 10).map((tx: any, i: number) => (
                          <tr key={i} className="border-b hover:bg-muted/50">
                            <td className="py-2 pr-3">
                              <button
                                className="font-mono text-primary hover:underline flex items-center gap-1"
                                onClick={() => {
                                  nav.setTxHash(tx.hash);
                                  nav.setActiveTab("tx");
                                }}
                              >
                                {truncateAddress(tx.hash, 10, 8)}
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            </td>
                            <td className="py-2 pr-3 font-mono">{truncateAddress(tx.from)}</td>
                            <td className="py-2 pr-3 font-mono">{truncateAddress(tx.to)}</td>
                            <td className="py-2 pr-3 text-right font-mono">{formatEth(tx.value, 4)}</td>
                            <td className="py-2 text-right text-muted-foreground">
                              {new Date(parseInt(tx.timeStamp) * 1000).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Run Analysis */}
          {contract.isVerified && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Static Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <button
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  onClick={runSlither}
                  disabled={analysisRunning}
                >
                  {analysisRunning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "Run Slither Analysis"
                  )}
                </button>

                {analysisStatus && (
                  <div className={`rounded-md p-3 text-sm flex items-center gap-2 ${
                    analysisStatus.startsWith("Error") || analysisStatus.startsWith("Failed")
                      ? "bg-destructive/10 text-destructive"
                      : analysisStatus.includes("complete")
                      ? "bg-green-500/10 text-green-700 dark:text-green-400"
                      : "bg-primary/10 text-primary"
                  }`}>
                    {analysisRunning && <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />}
                    {!analysisRunning && analysisStatus.includes("complete") && <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
                    {!analysisRunning && (analysisStatus.startsWith("Error") || analysisStatus.startsWith("Failed")) && <XCircle className="h-4 w-4 flex-shrink-0" />}
                    {analysisStatus}
                  </div>
                )}

                {/* Inline Findings */}
                {analysisFindings.length > 0 && (
                  <div className="space-y-3">
                    {/* Summary */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {(["high", "medium", "low", "info"] as const).map(sev => {
                        const count = analysisFindings.filter(f => f.severity === sev).length;
                        const colors = {
                          high: "bg-red-50 dark:bg-red-950/20 text-red-600 border-red-200 dark:border-red-800",
                          medium: "bg-orange-50 dark:bg-orange-950/20 text-orange-600 border-orange-200 dark:border-orange-800",
                          low: "bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 border-yellow-200 dark:border-yellow-800",
                          info: "bg-blue-50 dark:bg-blue-950/20 text-blue-600 border-blue-200 dark:border-blue-800",
                        };
                        return (
                          <div key={sev} className={`rounded-md border p-2 ${colors[sev]}`}>
                            <div className="text-lg font-bold">{count}</div>
                            <div className="text-[10px] uppercase font-medium">{sev}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Finding list */}
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {analysisFindings.map((finding, idx) => {
                        const sevIcon = {
                          high: <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />,
                          medium: <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />,
                          low: <Info className="h-4 w-4 text-yellow-500 flex-shrink-0" />,
                          info: <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />,
                        };
                        const sevBadge = {
                          high: "destructive" as const,
                          medium: "warning" as const,
                          low: "secondary" as const,
                          info: "default" as const,
                        };
                        return (
                          <div key={idx} className="border rounded-md p-3 text-sm space-y-1">
                            <div className="flex items-start gap-2">
                              {sevIcon[finding.severity]}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 justify-between">
                                  <span className="font-medium truncate">{finding.title}</span>
                                  <Badge variant={sevBadge[finding.severity]} className="text-[10px] flex-shrink-0">
                                    {finding.severity.toUpperCase()}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{finding.description}</p>
                                {finding.location && (
                                  <p className="text-[10px] font-mono text-muted-foreground mt-1">
                                    {finding.location.file}{finding.location.line ? `:${finding.location.line}` : ""}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Link to full findings */}
                    {analysisReportId && (
                      <button
                        className="w-full inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm hover:bg-accent"
                        onClick={() => {
                          nav.setReportId?.(analysisReportId);
                          nav.setActiveTab("findings");
                        }}
                      >
                        View Full Report in Findings Tab
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </button>
                    )}
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
