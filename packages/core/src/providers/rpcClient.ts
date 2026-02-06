import { DEFAULT_RETRY, DEFAULT_TIMEOUT_MS } from "../config/constants.js";

export type RpcRetry = {
  retries: number;
  baseDelayMs: number;
  jitterMs: number;

  // 允许自定义“哪些错误值得重试”
  shouldRetry?: (err: unknown) => boolean;
};

export type RpcClientOptions = {
  url: string;
  timeoutMs?: number;
  retry?: RpcRetry;
  headers?: Record<string, string>;

  // 有些 RPC 不支持 batch（或对 batch 很不稳定），可以强制单发
  forceSingle?: boolean;

  // 限制 batch 尺寸：debug_trace 大 payload 时建议小一点
  maxBatchSize?: number;

  // debug：保留最近一次请求/响应（用于排错）
  debug?: boolean;
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

// 更具体的 transport 错误（HTTP/超时/解析失败）
export class RpcTransportError extends Error {
  constructor(
    message: string,
    public readonly meta?: {
      url?: string;
      httpStatus?: number;
      httpStatusText?: string;
      bodySnippet?: string;
      method?: string;
      isTimeout?: boolean;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = "RpcTransportError";
  }
}

type JsonRpcReq = { jsonrpc: "2.0"; id: number; method: string; params: unknown[] };
type JsonRpcResp = {
  jsonrpc?: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function jitteredBackoff(baseDelayMs: number, jitterMs: number, attempt: number) {
  const exp = baseDelayMs * Math.pow(2, attempt);
  const jitter = jitterMs > 0 ? Math.floor(Math.random() * jitterMs) : 0;
  return exp + jitter;
}

function isObject(x: any): x is Record<string, any> {
  return typeof x === "object" && x !== null;
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n) + "…";
}

function defaultShouldRetry(err: unknown): boolean {
  // 超时/网络/HTTP 5xx/节点内部错误 通常值得重试
  if (err instanceof RpcTransportError) {
    if (err.meta?.isTimeout) return true;
    const st = err.meta?.httpStatus;
    if (st && st >= 500) return true;
    // fetch 自身错误
    return true;
  }
  if (err instanceof RpcError) {
    // JSON-RPC 常见 transient：
    // -32000 server error (geth/erigon 常见)
    // -32603 internal error
    return err.code === -32000 || err.code === -32603;
  }
  return false;
}

export class RpcClient {
  private url: string;
  private timeoutMs: number;
  private retry: RpcRetry;
  private headers: Record<string, string>;

  private idCounter = 1;

  private forceSingle: boolean;
  private maxBatchSize: number;
  private debug: boolean;

  // 仅 debug 用
  public lastDebug?: {
    request: unknown;
    response?: unknown;
    responseTextSnippet?: string;
  };

  constructor(opts: RpcClientOptions) {
    this.url = opts.url;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retry = opts.retry ?? DEFAULT_RETRY;
    this.headers = { "content-type": "application/json", ...(opts.headers ?? {}) };

    this.forceSingle = opts.forceSingle ?? false;
    this.maxBatchSize = opts.maxBatchSize ?? 50;
    this.debug = opts.debug ?? false;

    if (!this.retry.shouldRetry) {
      this.retry.shouldRetry = defaultShouldRetry;
    }
  }

  async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const [r] = await this.batchCall<T>([{ method, params }]);
    return r;
  }

  async batchCall<T>(calls: Array<{ method: string; params?: unknown[] }>): Promise<T[]> {
    if (calls.length === 0) return [];

    // 切 batch：避免一次 payload 太大
    if (calls.length > this.maxBatchSize) {
      const chunks: T[] = [];
      for (let i = 0; i < calls.length; i += this.maxBatchSize) {
        const part = await this.batchCall<T>(calls.slice(i, i + this.maxBatchSize));
        chunks.push(...part);
      }
      return chunks;
    }

    // 若强制单发：逐个 call（保持顺序）
    if (this.forceSingle || calls.length === 1) {
      const out: T[] = [];
      for (const c of calls) {
        const r = await this.withRetry(() => this.singleCall<T>(c.method, c.params ?? []));
        out.push(r);
      }
      return out;
    }

    // 正常 batch
    const reqs: JsonRpcReq[] = calls.map((c) => ({
      jsonrpc: "2.0",
      id: this.idCounter++,
      method: c.method,
      params: c.params ?? []
    }));

    return this.withRetry(() => this.batchCallAttempt<T>(reqs));
  }

  private async singleCall<T>(method: string, params: unknown[]): Promise<T> {
    const req: JsonRpcReq = { jsonrpc: "2.0", id: this.idCounter++, method, params };
    const resp = await this.postJson(req);

    const obj = this.ensureJsonRpcResp(resp, req.id);
    if (obj.error) throw new RpcError(obj.error.message, obj.error.code, obj.error.data);
    return obj.result as T;
  }

  private async batchCallAttempt<T>(reqs: JsonRpcReq[]): Promise<T[]> {
    const resp = await this.postJson(reqs);

    const arr: JsonRpcResp[] = Array.isArray(resp) ? resp : [resp];
    // 校验 + 映射
    const byId = new Map<number, JsonRpcResp>();

    for (const item of arr) {
      const obj = this.ensureJsonRpcResp(item, item?.id);
      if (byId.has(obj.id)) {
        throw new RpcTransportError(`Duplicate JSON-RPC response id=${obj.id}`, { url: this.url });
      }
      byId.set(obj.id, obj);
    }

    return reqs.map((rq) => {
      const r = byId.get(rq.id);
      if (!r) throw new RpcTransportError(`Missing RPC response for id=${rq.id}`, { url: this.url, method: rq.method });
      if (r.error) throw new RpcError(r.error.message, r.error.code, r.error.data);
      return r.result as T;
    });
  }

  private ensureJsonRpcResp(x: any, idHint: any): JsonRpcResp {
    if (!isObject(x)) {
      throw new RpcTransportError("RPC response is not an object", { url: this.url });
    }
    if (typeof x.id !== "number") {
      throw new RpcTransportError(`RPC response missing numeric id (got ${String(idHint)})`, { url: this.url });
    }
    // jsonrpc 字段有些节点会省略；我们不强制，但如果有且不对，报错
    if (x.jsonrpc !== undefined && x.jsonrpc !== "2.0") {
      throw new RpcTransportError(`RPC response has invalid jsonrpc=${String(x.jsonrpc)}`, { url: this.url });
    }
    return x as JsonRpcResp;
  }

  private async postJson(payload: unknown): Promise<unknown> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), this.timeoutMs);

    let text: string | undefined;

    try {
      if (this.debug) this.lastDebug = { request: payload };

      const res = await fetch(this.url, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      // 有些 RPC 在错误时也会返回 json body，但 status 非 200
      text = await res.text();
      const snippet = text ? truncate(text, 2000) : undefined;

      if (this.debug && this.lastDebug) {
        this.lastDebug.responseTextSnippet = snippet;
      }

      if (!res.ok) {
        throw new RpcTransportError(`HTTP ${res.status} ${res.statusText}`, {
          url: this.url,
          httpStatus: res.status,
          httpStatusText: res.statusText,
          bodySnippet: snippet
        });
      }

      // 尝试 parse json
      try {
        const json = text ? JSON.parse(text) : null;
        if (this.debug && this.lastDebug) this.lastDebug.response = json;
        return json;
      } catch (e) {
        throw new RpcTransportError("Failed to parse JSON response", {
          url: this.url,
          bodySnippet: snippet,
          cause: e
        });
      }
    } catch (e: any) {
      // Abort / timeout
      if (e?.name === "AbortError") {
        throw new RpcTransportError(`RPC request timed out after ${this.timeoutMs}ms`, {
          url: this.url,
          isTimeout: true,
          bodySnippet: text ? truncate(text, 2000) : undefined,
          cause: e
        });
      }
      // 其他 fetch 失败
      if (e instanceof RpcTransportError) throw e;
      throw new RpcTransportError(String(e?.message ?? e), { url: this.url, cause: e });
    } finally {
      clearTimeout(t);
    }
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    const { retries, baseDelayMs, jitterMs, shouldRetry } = this.retry;
    let lastErr: unknown;

    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        const okToRetry = shouldRetry ? shouldRetry(e) : defaultShouldRetry(e);
        if (i === retries || !okToRetry) break;
        await sleep(jitteredBackoff(baseDelayMs, jitterMs, i));
      }
    }
    throw lastErr;
  }
}
