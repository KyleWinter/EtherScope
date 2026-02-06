import { DEFAULT_RETRY, DEFAULT_TIMEOUT_MS } from "../config/constants.js";

export type RpcRetry = { retries: number; baseDelayMs: number; jitterMs: number };

export type RpcClientOptions = {
  url: string;
  timeoutMs?: number;
  retry?: RpcRetry;
  headers?: Record<string, string>;
};

export class RpcError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = "RpcError";
  }
}

type JsonRpcReq = { jsonrpc: "2.0"; id: number; method: string; params: unknown[] };
type JsonRpcResp = { jsonrpc: "2.0"; id: number; result?: unknown; error?: { code: number; message: string; data?: unknown } };

export class RpcClient {
  private url: string;
  private timeoutMs: number;
  private retry: RpcRetry;
  private headers: Record<string, string>;

  private idCounter = 1;

  constructor(opts: RpcClientOptions) {
    this.url = opts.url;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retry = opts.retry ?? DEFAULT_RETRY;
    this.headers = { "content-type": "application/json", ...(opts.headers ?? {}) };
  }

  async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const [r] = await this.batchCall<T>([{ method, params }]);
    return r;
  }

  async batchCall<T>(calls: Array<{ method: string; params?: unknown[] }>): Promise<T[]> {
    const reqs: JsonRpcReq[] = calls.map((c) => ({
      jsonrpc: "2.0",
      id: this.idCounter++,
      method: c.method,
      params: c.params ?? []
    }));

    const attempt = async (): Promise<T[]> => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const res = await fetch(this.url, {
          method: "POST",
          headers: this.headers,
          body: JSON.stringify(reqs),
          signal: controller.signal
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }

        const json = (await res.json()) as JsonRpcResp[] | JsonRpcResp;

        const arr = Array.isArray(json) ? json : [json];

        const byId = new Map(arr.map((x) => [x.id, x]));
        return reqs.map((rq) => {
          const resp = byId.get(rq.id);
          if (!resp) throw new Error(`Missing RPC response for id=${rq.id}`);
          if (resp.error) throw new RpcError(resp.error.message, resp.error.code, resp.error.data);
          return resp.result as T;
        });
      } finally {
        clearTimeout(t);
      }
    };

    return this.withRetry(attempt);
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    const { retries, baseDelayMs, jitterMs } = this.retry;
    let lastErr: unknown;

    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        if (i === retries) break;
        const delay = baseDelayMs * Math.pow(2, i) + Math.floor(Math.random() * jitterMs);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw lastErr;
  }
}
