"use client";

import { useState } from "react";
import { Search, Database, Gauge, Code, Lightbulb, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { apiClient } from "@/lib/api/client";
import type { GasProfile, StateDiff } from "@/lib/types";

interface ContractGasAnalysisProps {
  contractAddress: string;
}

export default function ContractGasAnalysis({ contractAddress }: ContractGasAnalysisProps) {
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [gasProfile, setGasProfile] = useState<GasProfile | null>(null);
  const [stateDiff, setStateDiff] = useState<StateDiff | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"gas" | "opcodes" | "suggestions" | "storage">("gas");

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txHash.trim()) return;

    setLoading(true);
    setError(null);
    setGasProfile(null);
    setStateDiff(null);

    try {
      const [gasRes, stateDiffRes] = await Promise.all([
        apiClient.getGasProfile(txHash),
        apiClient.getStateDiff(txHash),
      ]);

      if (gasRes.ok && gasRes.gasProfile) {
        setGasProfile(gasRes.gasProfile);
      } else if (gasRes.error) {
        setError(gasRes.error);
      }

      if (stateDiffRes.ok && stateDiffRes.stateDiff) {
        setStateDiff(stateDiffRes.stateDiff);
      }
    } catch (err: any) {
      setError(err.message || "Failed to analyze transaction");
    } finally {
      setLoading(false);
    }
  };

  const truncateAddress = (addr: string) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="space-y-4">
      {/* Search form */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleAnalyze} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter transaction hash to analyze gas usage..."
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              disabled={loading || !txHash.trim()}
            >
              <Search className="mr-2 h-4 w-4" />
              Analyze
            </button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            Analyze gas usage and storage changes for transactions involving this contract
          </p>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading gas analysis...
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-destructive">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {(gasProfile || stateDiff) && (
        <>
          {/* Tabs */}
          <div className="flex gap-2 border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab("gas")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "gas"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-1">
                <Gauge className="h-3 w-3" />
                Gas Breakdown ({gasProfile?.functionBreakdown.length || 0})
              </span>
            </button>
            <button
              onClick={() => setActiveTab("opcodes")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "opcodes"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-1">
                <Code className="h-3 w-3" />
                Opcodes ({gasProfile?.opcodeStats.length || 0})
              </span>
            </button>
            <button
              onClick={() => setActiveTab("suggestions")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "suggestions"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                Suggestions ({gasProfile?.suggestions.length || 0})
              </span>
            </button>
            <button
              onClick={() => setActiveTab("storage")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "storage"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                Storage Changes ({stateDiff?.storageChanges.length || 0})
              </span>
            </button>
          </div>

          {/* Gas Breakdown Tab */}
          {activeTab === "gas" && gasProfile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Gas Breakdown by Function
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="mb-4 p-3 bg-muted rounded-md">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Total Gas Used: </span>
                      <span className="font-mono font-semibold">{gasProfile.totalGas.toLocaleString()}</span>
                    </div>
                  </div>
                  {gasProfile.functionBreakdown.slice(0, 20).map((func, idx) => {
                    const percentage = gasProfile.totalGas > 0
                      ? (func.gasUsed / gasProfile.totalGas * 100).toFixed(2)
                      : "0.00";

                    return (
                      <div key={idx} className="border rounded-md p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs">{func.selector}</span>
                          <div className="flex items-center gap-2">
                            <Badge className="text-xs">{func.callCount} calls</Badge>
                            <Badge className="text-xs bg-blue-100 text-blue-800">
                              {percentage}%
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Total Gas: </span>
                            <span className="font-mono">{func.gasUsed.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Avg Gas: </span>
                            <span className="font-mono">{Math.round(func.avgGas).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Opcodes Tab */}
          {activeTab === "opcodes" && gasProfile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Opcode Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-3">Opcode</th>
                        <th className="text-right py-2 pr-3">Count</th>
                        <th className="text-right py-2 pr-3">Total Gas</th>
                        <th className="text-right py-2">Avg Gas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gasProfile.opcodeStats.slice(0, 30).map((opcode, idx) => {
                        const getOpcodeColor = (op: string) => {
                          if (op === "SSTORE" || op === "SLOAD") return "text-orange-600 dark:text-orange-400";
                          if (op.startsWith("LOG")) return "text-blue-600 dark:text-blue-400";
                          if (op === "CALL" || op === "DELEGATECALL" || op === "STATICCALL") return "text-purple-600 dark:text-purple-400";
                          return "";
                        };

                        return (
                          <tr key={idx} className="border-b hover:bg-muted/50">
                            <td className={`py-2 pr-3 font-mono font-semibold ${getOpcodeColor(opcode.opcode)}`}>
                              {opcode.opcode}
                            </td>
                            <td className="py-2 pr-3 text-right font-mono">{opcode.count.toLocaleString()}</td>
                            <td className="py-2 pr-3 text-right font-mono">{opcode.totalGas.toLocaleString()}</td>
                            <td className="py-2 text-right font-mono">{Math.round(opcode.avgGas).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Optimization Suggestions Tab */}
          {activeTab === "suggestions" && gasProfile && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Optimization Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {gasProfile.suggestions.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-muted-foreground">No optimization suggestions - looks good! 🎉</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {gasProfile.suggestions.map((suggestion, idx) => {
                      const getSeverityColor = (severity: string) => {
                        switch (severity) {
                          case "high":
                            return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800";
                          case "medium":
                            return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800";
                          case "low":
                            return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800";
                          default:
                            return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-800";
                        }
                      };

                      const getSeverityIcon = (severity: string) => {
                        switch (severity) {
                          case "high":
                            return "🔴";
                          case "medium":
                            return "🟡";
                          case "low":
                            return "🔵";
                          default:
                            return "⚪";
                        }
                      };

                      return (
                        <div key={idx} className={`border rounded-md p-4 ${getSeverityColor(suggestion.severity)}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-start gap-2">
                              <span className="text-lg">{getSeverityIcon(suggestion.severity)}</span>
                              <div>
                                <h4 className="font-semibold text-sm">{suggestion.title}</h4>
                                <Badge className="text-[10px] mt-1">{suggestion.category}</Badge>
                              </div>
                            </div>
                            {suggestion.gasImpact && (
                              <Badge className="text-xs">
                                {suggestion.gasImpact.toLocaleString()} gas
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm mt-2 leading-relaxed">{suggestion.description}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Storage Changes Tab */}
          {activeTab === "storage" && stateDiff && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Storage Changes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stateDiff.storageChanges.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No storage changes</p>
                ) : (
                  <div className="space-y-3">
                    {stateDiff.storageChanges.map((change, idx) => (
                      <div key={idx} className="border rounded-md p-3">
                        <div className="mb-2">
                          <span className="text-xs text-muted-foreground">Contract: </span>
                          <span className="font-mono text-xs">{truncateAddress(change.address)}</span>
                        </div>
                        <div className="mb-2">
                          <span className="text-xs text-muted-foreground">Slot: </span>
                          <span className="font-mono text-xs break-all">{change.slot}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Before: </span>
                            <span className="font-mono break-all">{change.before}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">After: </span>
                            <span className="font-mono break-all">{change.after}</span>
                          </div>
                        </div>
                      </div>
                    ))}
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
