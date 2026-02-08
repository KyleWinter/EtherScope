import type {
  AnalysisReport, MonitoredAddress, GasTrend, WsMessage,
  EthTransaction, EthTransactionReceipt, EthBlock, ContractInfo,
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
      }
    }
  }

  private notifyListeners(message: WsMessage) {
    const channel = this.getChannelFromMessage(message);
    const channelListeners = this.listeners.get(channel);
    if (channelListeners) {
      channelListeners.forEach((callback) => callback(message));
    }

    const allListeners = this.listeners.get("*");
    if (allListeners) {
      allListeners.forEach((callback) => callback(message));
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
