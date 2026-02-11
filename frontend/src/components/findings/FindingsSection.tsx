"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle, Info, XCircle, Search, Download, FileText, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { apiClient } from "@/lib/api/client";
import type { Finding, AnalysisReport } from "@/lib/types";

// Demo data for preview
const DEMO_REPORT: AnalysisReport = {
  txHash: "demo",
  findings: [
    {
      severity: "high",
      title: "Reentrancy Vulnerability",
      description: "Contract is vulnerable to reentrancy attacks. External calls are made before state updates.",
      location: { file: "Contract.sol", line: 45, column: 8 },
      impact: "Attackers could drain contract funds by recursively calling vulnerable functions.",
      confidence: "High",
    },
    {
      severity: "medium",
      title: "Unchecked Return Value",
      description: "External call return value is not checked, which may lead to silent failures.",
      location: { file: "Contract.sol", line: 78, column: 12 },
      impact: "Transaction may fail silently without reverting.",
      confidence: "Medium",
    },
    {
      severity: "low",
      title: "Floating Pragma",
      description: "Contract uses a floating pragma (^0.8.0). Consider locking to a specific version.",
      location: { file: "Contract.sol", line: 1, column: 1 },
      impact: "Different compiler versions may produce different bytecode.",
      confidence: "High",
    },
    {
      severity: "info",
      title: "Public Function Could Be External",
      description: "Function transfer() is public but never called internally. Consider making it external.",
      location: { file: "Contract.sol", line: 92, column: 5 },
      impact: "Gas optimization - external functions are cheaper to call.",
      confidence: "High",
    },
  ],
  tools: {
    slither: { ok: true, message: "Analysis complete" },
    mythril: { ok: false, message: "Not run" },
  },
  createdAt: new Date().toISOString(),
};

export default function FindingsSection({ initialReportId }: { initialReportId?: string } = {}) {
  const [txHash, setTxHash] = useState("");
  const [reportId, setReportId] = useState(initialReportId || "");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [searchMode, setSearchMode] = useState<"txHash" | "reportId">("reportId");

  // Auto-load if initialReportId is provided
  React.useEffect(() => {
    if (initialReportId) {
      setReportId(initialReportId);
      setSearchMode("reportId");
      handleFetchReportById(initialReportId);
    }
  }, [initialReportId]);

  const handleFetchReportById = async (id?: string) => {
    const idToFetch = id || reportId;
    if (!idToFetch) {
      setError("Report ID is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getReportById(idToFetch);

      if (response.ok && response.report) {
        setReport(response.report);
      } else {
        setError(response.error || "Failed to fetch report");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchReport = async () => {
    if (searchMode === "reportId") {
      return handleFetchReportById();
    }

    if (!txHash) {
      setError("Transaction hash is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getReport(txHash);

      if (response.ok && response.report) {
        setReport(response.report);
      } else {
        setError(response.error || "Failed to fetch report");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch report");
    } finally {
      setLoading(false);
    }
  };

  const loadDemoReport = () => {
    setReport(DEMO_REPORT);
    setTxHash("demo");
    setError(null);
  };

  const exportReport = (format: "json" | "csv") => {
    if (!report) return;

    const filename = report.txHash || report.id || new Date().toISOString();

    if (format === "json") {
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `security-report-${filename}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV export
      const headers = ["Severity", "Title", "Description", "Location", "Impact", "Confidence"];
      const rows = report.findings.map((f) => [
        f.severity,
        f.title,
        f.description,
        f.location ? `${f.location.file}:${f.location.line || ""}` : "",
        f.impact || "",
        f.confidence || "",
      ]);
      const csv = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `security-report-${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "medium":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "low":
        return <Info className="h-5 w-5 text-yellow-500" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "destructive" | "warning" | "secondary" | "default"> = {
      high: "destructive",
      medium: "warning",
      low: "secondary",
      info: "default",
    };
    return variants[severity] || "default";
  };

  const getRecommendation = (title: string): string | null => {
    const recommendations: Record<string, string> = {
      "Reentrancy": "Use the Checks-Effects-Interactions pattern. Update state before making external calls.",
      "Unchecked Return": "Always check return values of external calls. Use require() or if-revert patterns.",
      "Floating Pragma": "Lock to a specific Solidity version: pragma solidity 0.8.19;",
      "Public Function": "Change function visibility to external if not called internally.",
      "Timestamp Dependence": "Avoid using block.timestamp for critical logic. Consider using block.number instead.",
    };

    for (const [key, value] of Object.entries(recommendations)) {
      if (title.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
    return null;
  };

  const filteredFindings = report?.findings.filter((f) => {
    const matchesSeverity = !selectedSeverity || f.severity === selectedSeverity;
    const matchesSearch =
      !searchText ||
      f.title.toLowerCase().includes(searchText.toLowerCase()) ||
      f.description.toLowerCase().includes(searchText.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  const severityCounts = report?.findings.reduce(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) || {};

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Security Findings</CardTitle>
          <CardDescription>
            View vulnerability reports from static analysis tools
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-start flex-col sm:flex-row">
            <div className="flex gap-2 items-center w-full">
              <select
                value={searchMode}
                onChange={(e) => setSearchMode(e.target.value as "txHash" | "reportId")}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={loading}
              >
                <option value="reportId">Report ID</option>
                <option value="txHash">TX Hash</option>
              </select>
              {searchMode === "reportId" ? (
                <Input
                  placeholder="Enter report ID (e.g., abc123...)"
                  value={reportId}
                  onChange={(e) => setReportId(e.target.value)}
                  disabled={loading}
                  className="flex-1"
                />
              ) : (
                <Input
                  placeholder="Enter transaction hash (0x...)"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  disabled={loading}
                  className="flex-1"
                />
              )}
              <Button
                onClick={handleFetchReport}
                disabled={loading || (searchMode === "reportId" ? !reportId : !txHash)}
              >
                {loading ? (
                  <>Loading...</>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Fetch
                  </>
                )}
              </Button>
            </div>
            <Button onClick={loadDemoReport} variant="outline" disabled={loading} className="w-full sm:w-auto">
              <Sparkles className="mr-2 h-4 w-4" />
              Demo
            </Button>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {!report && !error && !loading && (
            <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
              <p className="mb-2">💡 <strong>Tip:</strong> Click &quot;Demo&quot; to see a sample security report, or enter a transaction hash to fetch an analysis report.</p>
              <p className="text-xs">Security reports are generated from static analysis tools like Slither and Mythril.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {report && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Analysis Summary</CardTitle>
                {report.txHash && report.txHash !== "demo" && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {report.txHash.slice(0, 10)}...{report.txHash.slice(-8)}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div
                  className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/30"
                  onClick={() =>
                    setSelectedSeverity(selectedSeverity === "high" ? null : "high")
                  }
                >
                  <div className="text-sm text-muted-foreground">High</div>
                  <div className="text-2xl font-bold text-red-600">
                    {severityCounts.high || 0}
                  </div>
                </div>
                <div
                  className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-950/30"
                  onClick={() =>
                    setSelectedSeverity(selectedSeverity === "medium" ? null : "medium")
                  }
                >
                  <div className="text-sm text-muted-foreground">Medium</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {severityCounts.medium || 0}
                  </div>
                </div>
                <div
                  className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-950/30"
                  onClick={() =>
                    setSelectedSeverity(selectedSeverity === "low" ? null : "low")
                  }
                >
                  <div className="text-sm text-muted-foreground">Low</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {severityCounts.low || 0}
                  </div>
                </div>
                <div
                  className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/30"
                  onClick={() =>
                    setSelectedSeverity(selectedSeverity === "info" ? null : "info")
                  }
                >
                  <div className="text-sm text-muted-foreground">Info</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {severityCounts.info || 0}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <div className="text-sm font-medium mb-2">Analysis Tools</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(report.tools).map(([tool, status]) => (
                      <div
                        key={tool}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs border ${
                          status.ok
                            ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400"
                            : "bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-950/20 dark:border-gray-800"
                        }`}
                      >
                        {status.ok ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        <span className="font-medium capitalize">{tool}</span>
                        {status.message && (
                          <span className="text-[10px] opacity-75">({status.message})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span>📅 Created:</span>
                    <span>{new Date(report.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>📊 Total Findings:</span>
                    <span className="font-semibold">{report.findings.length}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <CardTitle>
                  Findings ({filteredFindings?.length || 0})
                </CardTitle>
                <div className="flex gap-2">
                  {selectedSeverity && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSeverity(null)}
                    >
                      Clear Filter
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportReport("json")}
                  >
                    <Download className="mr-2 h-3 w-3" />
                    JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportReport("csv")}
                  >
                    <FileText className="mr-2 h-3 w-3" />
                    CSV
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Search findings..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="max-w-sm"
                />
                {searchText && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchText("")}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {filteredFindings && filteredFindings.length > 0 ? (
                <div className="space-y-4">
                  {filteredFindings.map((finding, idx) => {
                    const recommendation = getRecommendation(finding.title);
                    return (
                      <div
                        key={idx}
                        className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(finding.severity)}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold">{finding.title}</h4>
                              <Badge variant={getSeverityBadge(finding.severity)}>
                                {finding.severity.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {finding.description}
                            </p>
                            {finding.location && (
                              <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                                📁 {finding.location.file}
                                {finding.location.line && `:${finding.location.line}`}
                                {finding.location.column && `:${finding.location.column}`}
                              </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              {finding.impact && (
                                <div>
                                  <span className="font-medium">💥 Impact:</span>{" "}
                                  <span className="text-muted-foreground">{finding.impact}</span>
                                </div>
                              )}
                              {finding.confidence && (
                                <div>
                                  <span className="font-medium">🎯 Confidence:</span>{" "}
                                  <Badge variant="outline" className="text-xs">
                                    {finding.confidence}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            {recommendation && (
                              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded text-sm">
                                <div className="font-medium text-blue-700 dark:text-blue-400 mb-1">
                                  💡 Recommendation
                                </div>
                                <div className="text-blue-600 dark:text-blue-300">
                                  {recommendation}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {selectedSeverity
                    ? `No ${selectedSeverity} severity findings found`
                    : "No findings to display"}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
