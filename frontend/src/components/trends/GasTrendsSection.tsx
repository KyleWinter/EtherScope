"use client";

import { useState } from "react";
import { TrendingUp, Search } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { apiClient } from "@/lib/api/client";
import { formatGas, formatTimestamp } from "@/lib/utils";
import type { GasTrend } from "@/lib/types";

export default function GasTrendsSection() {
  const [contractAddress, setContractAddress] = useState("");
  const [trends, setTrends] = useState<GasTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchTrends = async () => {
    if (!contractAddress) {
      setError("Contract address is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getTrends(contractAddress, 200);

      if (response.ok) {
        setTrends(response.rows);
      } else {
        setError("Failed to fetch trends");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch trends");
    } finally {
      setLoading(false);
    }
  };

  const chartData = trends.map((t) => ({
    timestamp: formatTimestamp(t.timestamp),
    gasUsed: t.gasUsed,
    txHash: t.txHash.slice(0, 10) + "...",
  }));

  const avgGas = trends.length
    ? trends.reduce((sum, t) => sum + t.gasUsed, 0) / trends.length
    : 0;
  const maxGas = trends.length ? Math.max(...trends.map((t) => t.gasUsed)) : 0;
  const minGas = trends.length ? Math.min(...trends.map((t) => t.gasUsed)) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Gas Usage Trends</CardTitle>
          <CardDescription>
            Analyze gas consumption patterns for your smart contracts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter contract address"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              disabled={loading}
            />
            <Button onClick={handleFetchTrends} disabled={loading || !contractAddress}>
              {loading ? (
                <>Loading...</>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Fetch Trends
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {trends.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Gas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatGas(avgGas)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {trends.length} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Maximum Gas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatGas(maxGas)}</div>
                <p className="text-xs text-muted-foreground mt-1">Peak usage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Minimum Gas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatGas(minGas)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Most efficient</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Gas Usage Over Time</CardTitle>
              <CardDescription>Historical gas consumption trend</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="gasUsed"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gas Distribution</CardTitle>
              <CardDescription>Gas usage per transaction</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.slice(0, 20)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="txHash"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="gasUsed" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trends.slice(0, 10).map((trend, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-mono text-sm">{trend.txHash}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTimestamp(trend.timestamp)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatGas(trend.gasUsed)}</div>
                      <div className="text-xs text-muted-foreground">gas</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
