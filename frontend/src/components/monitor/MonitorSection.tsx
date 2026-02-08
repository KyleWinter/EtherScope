"use client";

import { useState, useEffect } from "react";
import { Bell, Plus, Trash2, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { apiClient } from "@/lib/api/client";
import { useWebSocket } from "@/hooks/useWebSocket";
import { truncateAddress, formatTimestamp } from "@/lib/utils";
import type { MonitoredAddress, MonitorAlert, WsMessage } from "@/lib/types";

export default function MonitorSection() {
  const [address, setAddress] = useState("");
  const [monitors, setMonitors] = useState<MonitoredAddress[]>([]);
  const [alerts, setAlerts] = useState<MonitorAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useWebSocket("*", (message: WsMessage) => {
    if (message.type === "monitor:alert") {
      setAlerts((prev) => [
        {
          address: message.address,
          message: message.message,
          timestamp: Date.now(),
        },
        ...prev.slice(0, 49),
      ]);
    }
  });

  useEffect(() => {
    loadMonitors();
  }, []);

  const loadMonitors = async () => {
    try {
      const response = await apiClient.listMonitors();
      if (response.ok && response.items) {
        setMonitors(response.items);
      }
    } catch (err) {
      console.error("Failed to load monitors:", err);
    }
  };

  const handleSubscribe = async () => {
    if (!address) {
      setError("Address is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.subscribeMonitor(address);

      if (response.ok) {
        setAddress("");
        await loadMonitors();
      } else {
        setError(response.error || "Failed to subscribe");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to subscribe");
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async (addr: string) => {
    try {
      const response = await apiClient.unsubscribeMonitor(addr);

      if (response.ok) {
        await loadMonitors();
      } else {
        setError(response.error || "Failed to unsubscribe");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unsubscribe");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Real-Time Contract Monitoring</CardTitle>
          <CardDescription>
            Subscribe to contracts and receive alerts for suspicious activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter contract address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={loading}
            />
            <Button onClick={handleSubscribe} disabled={loading || !address}>
              <Plus className="mr-2 h-4 w-4" />
              Subscribe
            </Button>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Monitored Contracts ({monitors.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {monitors.length > 0 ? (
              <div className="space-y-2">
                {monitors.map((monitor) => (
                  <div
                    key={monitor.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-mono text-sm font-medium">
                        {truncateAddress(monitor.address, 10, 8)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Since {formatTimestamp(monitor.subscribedAt)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnsubscribe(monitor.address)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No contracts being monitored
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Recent Alerts ({alerts.length})
              </CardTitle>
              {alerts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAlerts([])}
                >
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {alerts.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className="p-3 border border-orange-200 dark:border-orange-800 rounded-lg bg-orange-50 dark:bg-orange-950/20"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="warning">Alert</Badge>
                          <span className="font-mono text-xs">
                            {truncateAddress(alert.address)}
                          </span>
                        </div>
                        <p className="text-sm">{alert.message}</p>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatTimestamp(alert.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No alerts yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alert Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border">
              <div className="text-sm text-muted-foreground">Total Alerts</div>
              <div className="text-2xl font-bold">{alerts.length}</div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-sm text-muted-foreground">Monitored</div>
              <div className="text-2xl font-bold">{monitors.length}</div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-sm text-muted-foreground">Last Hour</div>
              <div className="text-2xl font-bold">
                {
                  alerts.filter(
                    (a) => Date.now() - a.timestamp < 60 * 60 * 1000
                  ).length
                }
              </div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-sm text-muted-foreground">Active</div>
              <div className="text-2xl font-bold text-green-600">
                {monitors.length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
