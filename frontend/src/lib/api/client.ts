import type {
  AnalysisReport, MonitoredAddress, GasTrend, WsMessage,
  EthTransaction, EthTransactionReceipt, EthBlock, ContractInfo,
  StateDiff, GasProfile,
} from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8787";

export interface AnalyzeRequest {
  txHash?: string;
  projectRoot: string;
  target?: string;
  tools?: Array<"slither" | "mythril">;
  mode?: "local" | "docker";
  timeoutMs?: number;
}

export interface AnalyzeResponse {
  ok: boolean;
  jobId?: string;
  error?: any;
}

export interface ReportResponse {
  ok: boolean;
  report?: AnalysisReport;
  error?: string;
}

export interface TrendsResponse {
  ok: boolean;
  contract: string;
  rows: GasTrend[];
}

export interface MonitorResponse {
  ok: boolean;
  id?: string;
  items?: MonitoredAddress[];
  error?: any;
}

class ApiClient {
  private async fetch(path: string, options?: RequestInit) {
    const url = `${API_BASE}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    return response.json();
  }

  async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    return this.fetch("/analyze", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getReport(txHash: string): Promise<ReportResponse> {
    return this.fetch(`/tx/${txHash}/report`);
  }

  async getReportById(reportId: string): Promise<ReportResponse> {
    return this.fetch(`/report/${reportId}`);
  }

  async analyzeSource(request: { sourceCode: string; contractName?: string; contractAddress?: string }): Promise<AnalyzeResponse> {
    return this.fetch("/analyze/source", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getTrends(contract: string, limit = 200): Promise<TrendsResponse> {
    return this.fetch(`/trends?contract=${encodeURIComponent(contract)}&limit=${limit}`);
  }

  async subscribeMonitor(address: string): Promise<MonitorResponse> {
    return this.fetch("/monitor/subscribe", {
      method: "POST",
      body: JSON.stringify({ address }),
    });
  }

  async unsubscribeMonitor(address: string): Promise<MonitorResponse> {
    return this.fetch("/monitor/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ address }),
    });
  }

  async listMonitors(): Promise<MonitorResponse> {
    return this.fetch("/monitor/list");
  }

  // Etherscan endpoints
  async getTransaction(hash: string): Promise<{ ok: boolean; data?: EthTransaction; error?: string }> {
    return this.fetch(`/etherscan/tx/${hash}`);
  }

  async getTransactionReceipt(hash: string): Promise<{ ok: boolean; data?: EthTransactionReceipt; error?: string }> {
    return this.fetch(`/etherscan/tx/${hash}/receipt`);
  }

  async getLatestBlockNumber(): Promise<{ ok: boolean; data?: string; error?: string }> {
    return this.fetch("/etherscan/block/latest");
  }

  async getBlock(number: string): Promise<{ ok: boolean; data?: EthBlock; error?: string }> {
    return this.fetch(`/etherscan/block/${number}`);
  }

  async getContractInfo(address: string): Promise<{ ok: boolean; data?: ContractInfo; error?: string }> {
    return this.fetch(`/etherscan/contract/${address}`);
  }

  async getAccountTransactions(address: string, page = 1, offset = 20): Promise<{ ok: boolean; data?: any[]; error?: string }> {
    return this.fetch(`/etherscan/account/${address}/txs?page=${page}&offset=${offset}`);
  }

  // Trace endpoints
  async getTransactionTrace(hash: string): Promise<{ ok: boolean; trace?: any; error?: string }> {
    return this.fetch(`/trace/${hash}`);
  }

  async getInternalTransactions(hash: string): Promise<{ ok: boolean; internals?: any[]; count?: number; error?: string }> {
    return this.fetch(`/trace/${hash}/internal`);
  }

  async getDecodedLogs(hash: string): Promise<{ ok: boolean; logs?: any[]; count?: number; error?: string }> {
    return this.fetch(`/trace/${hash}/logs`);
  }

  async getStateDiff(hash: string): Promise<{ ok: boolean; stateDiff?: any; warning?: string; error?: string }> {
    return this.fetch(`/trace/${hash}/state-diff`);
  }

  async getGasProfile(hash: string): Promise<{ ok: boolean; gasProfile?: GasProfile; error?: string; errorType?: string }> {
    return this.fetch(`/trace/${hash}/gas-profile`);
  }
}

export const apiClient = new ApiClient();

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(message: WsMessage) => void>> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket(WS_BASE);

    this.ws.onopen = () => {
      console.log("[WebSocket] Connected");
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WsMessage = JSON.parse(event.data);
        this.notifyListeners(message);
      } catch (error) {
        console.error("[WebSocket] Failed to parse message:", error);
      }
    };

    this.ws.onerror = (error) => {
      console.error("[WebSocket] Error:", error);
    };

    this.ws.onclose = () => {
      console.log("[WebSocket] Disconnected");
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("[WebSocket] Max reconnect attempts reached");
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      console.log(`[WebSocket] Reconnecting (attempt ${this.reconnectAttempts})...`);
      this.connect();
    }, delay);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  subscribe(channel: string, callback: (message: WsMessage) => void) {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(callback);

    // Send subscribe message to server for both job:update and job:done
    if (channel.startsWith("job:")) {
      const jobId = channel.replace("job:", "");
      this.sendSubscribe(`job:update:${jobId}`);
      this.sendSubscribe(`job:done:${jobId}`);
    } else {
      this.sendSubscribe(channel);
    }

    return () => {
      this.unsubscribe(channel, callback);
    };
  }

  unsubscribe(channel: string, callback: (message: WsMessage) => void) {
    const channelListeners = this.listeners.get(channel);
    if (channelListeners) {
      channelListeners.delete(callback);
      if (channelListeners.size === 0) {
        this.listeners.delete(channel);

        // Send unsubscribe message to server
        if (channel.startsWith("job:")) {
          const jobId = channel.replace("job:", "");
          this.sendUnsubscribe(`job:update:${jobId}`);
          this.sendUnsubscribe(`job:done:${jobId}`);
        } else {
          this.sendUnsubscribe(channel);
        }
      }
    }
  }

  private sendSubscribe(topic: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "subscribe", topic }));
    }
  }

  private sendUnsubscribe(topic: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "unsubscribe", topic }));
    }
  }

  private notifyListeners(message: any) {
    // Backend sends { topic: "job:update:xxx", payload: { ... } }
    if (message.topic && message.payload) {
      const topic = message.topic as string;

      // Extract jobId from topic for job-related messages
      if (topic.startsWith("job:update:") || topic.startsWith("job:done:")) {
        const jobId = topic.split(":")[2];
        const channel = `job:${jobId}`;
        const channelListeners = this.listeners.get(channel);

        // Reconstruct WsMessage format for backward compatibility
        const wsMessage: WsMessage = {
          type: topic.startsWith("job:update:") ? "job:update" : "job:done",
          jobId,
          ...message.payload,
        };

        if (channelListeners) {
          channelListeners.forEach((callback) => callback(wsMessage));
        }
      }

      // Notify wildcard listeners
      const allListeners = this.listeners.get("*");
      if (allListeners) {
        allListeners.forEach((callback) => callback(message.payload));
      }
    } else {
      // Handle direct messages (like "hello")
      const allListeners = this.listeners.get("*");
      if (allListeners) {
        allListeners.forEach((callback) => callback(message));
      }
    }
  }

  private getChannelFromMessage(message: WsMessage): string {
    switch (message.type) {
      case "job:update":
      case "job:done":
        return `job:${message.jobId}`;
      case "monitor:alert":
        return `monitor:${message.address.toLowerCase()}`;
      default:
        return "*";
    }
  }
}

export const wsClient = new WebSocketClient();
