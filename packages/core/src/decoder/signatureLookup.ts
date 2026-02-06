import { Cache } from "../providers/cache.js";

export type SignatureKind = "function" | "event";

export type SignatureHit = {
  // e.g. "transfer(address,uint256)" or "Transfer(address,address,uint256)"
  text: string;

  // 来源：4byte / openchain / sourcify (openchain 接口)
  source: "4byte" | "openchain";

  // 可选：数据库 id / 过滤信息等
  meta?: Record<string, unknown>;
};

export type SignatureLookupOptions = {
  cache?: Cache;

  // 超时（ms）
  timeoutMs?: number;

  // 查询源开关（默认都开）
  use4byte?: boolean;
  useOpenchain?: boolean;

  // 4byte 接口（默认 4byte.directory）
  fourByteBaseUrl?: string;

  // OpenChain 接口（默认 api.openchain.xyz；Sourcify 也兼容同一接口）
  openchainBaseUrl?: string;

  // 每个 selector/topic 返回最多 N 个候选
  maxHits?: number;

  // OpenChain 的 filter 参数：true 会尝试过滤掉重复/噪音（推荐 true）
  openchainFilter?: boolean;

  // 若一个源失败是否继续尝试下一个源（默认 true）
  continueOnError?: boolean;
};

const DEFAULTS: Required<Omit<SignatureLookupOptions, "cache">> = {
  timeoutMs: 4000,
  use4byte: true,
  useOpenchain: true,
  fourByteBaseUrl: "https://www.4byte.directory",
  openchainBaseUrl: "https://api.openchain.xyz",
  maxHits: 5,
  openchainFilter: true,
  continueOnError: true
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function normHex(x: string): string {
  const s = x.toLowerCase();
  return s.startsWith("0x") ? s : `0x${s}`;
}

function isHex(s: string) {
  return /^0x[0-9a-f]+$/i.test(s);
}

function ensureSelector4(sel: string): string {
  const x = normHex(sel);
  if (!isHex(x) || x.length !== 10) throw new Error(`Invalid 4-byte selector: ${sel}`);
  return x;
}

function ensureTopic32(topic: string): string {
  const x = normHex(topic);
  if (!isHex(x) || x.length !== 66) throw new Error(`Invalid 32-byte topic: ${topic}`);
  return x;
}

async function fetchJson(url: string, timeoutMs: number): Promise<any> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "GET", signal: controller.signal });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
    return text ? JSON.parse(text) : null;
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error(`Fetch timeout after ${timeoutMs}ms: ${url}`);
    throw e;
  } finally {
    clearTimeout(t);
  }
}

/**
 * SignatureLookup
 * - function selector (0x????????) -> ["transfer(address,uint256)", ...]
 * - event topic0 (0x....32bytes) -> ["Transfer(address,address,uint256)", ...]
 *
 * 数据源：
 * - 4byte.directory API: /api/v1/signatures/?hex_signature=0x12345678 和 /api/v1/event-signatures/?hex_signature=0x...
 * - openchain API: /signature-database/v1/lookup?function=0x12345678&filter=true
 *                 /signature-database/v1/lookup?event=0x...&filter=true
 */
export class SignatureLookup {
  private opts: Required<Omit<SignatureLookupOptions, "cache">>;
  private cache?: Cache;

  constructor(opts: SignatureLookupOptions = {}) {
    this.cache = opts.cache;
    this.opts = { ...DEFAULTS, ...opts };
  }

  async lookupFunction(selector4: string): Promise<SignatureHit[]> {
    const sel = ensureSelector4(selector4);
    return this.lookup("function", sel);
  }

  async lookupEvent(topic0: string): Promise<SignatureHit[]> {
    const tp = ensureTopic32(topic0);
    return this.lookup("event", tp);
  }

  /**
   * 只要你传 selector（0x + 8 hex）就当 function
   * 传 topic（0x + 64 hex）就当 event
   */
  async lookupAuto(hex: string): Promise<{ kind: SignatureKind; hits: SignatureHit[] }> {
    const x = normHex(hex);
    if (x.length === 10) return { kind: "function", hits: await this.lookupFunction(x) };
    if (x.length === 66) return { kind: "event", hits: await this.lookupEvent(x) };
    throw new Error(`lookupAuto expects selector4 or topic32, got len=${x.length}: ${hex}`);
  }

  private async lookup(kind: SignatureKind, hex: string): Promise<SignatureHit[]> {
    const key = `sig:${kind}:${hex}`;
    if (this.cache) {
      return this.cache.getOrSet(key, async () => this.lookupUncached(kind, hex));
    }
    return this.lookupUncached(kind, hex);
  }

  private async lookupUncached(kind: SignatureKind, hex: string): Promise<SignatureHit[]> {
    const hits: SignatureHit[] = [];

    const try4byte = async () => {
      if (!this.opts.use4byte) return;
      const base = this.opts.fourByteBaseUrl.replace(/\/$/, "");
      const path = kind === "function" ? "/api/v1/signatures/" : "/api/v1/event-signatures/";
      // 4byte docs: hex_signature 支持 0x 前缀，可选
      const url = `${base}${path}?hex_signature=${encodeURIComponent(hex)}`;

      const json = await fetchJson(url, this.opts.timeoutMs);
      const results = Array.isArray(json?.results) ? json.results : [];
      for (const r of results) {
        const text = typeof r?.text_signature === "string" ? r.text_signature : undefined;
        if (text) hits.push({ text, source: "4byte", meta: { id: r.id, hex_signature: r.hex_signature } });
      }
    };

    const tryOpenchain = async () => {
      if (!this.opts.useOpenchain) return;
      const base = this.opts.openchainBaseUrl.replace(/\/$/, "");
      const filter = this.opts.openchainFilter ? "true" : "false";

      // openchain lookup:
      // /signature-database/v1/lookup?function=0x12345678&filter=true
      // /signature-database/v1/lookup?event=0x...&filter=true
      const q = kind === "function" ? `function=${encodeURIComponent(hex)}` : `event=${encodeURIComponent(hex)}`;
      const url = `${base}/signature-database/v1/lookup?${q}&filter=${filter}`;

      const json = await fetchJson(url, this.opts.timeoutMs);
      // format:
      // { ok:true, result:{ function:{ "0x....":[{name:"transfer(address,uint256)", filtered:false}, ...] }, event:{...}}}
      const bucket = kind === "function" ? json?.result?.function : json?.result?.event;
      const arr = bucket?.[hex] ?? bucket?.[hex.toLowerCase()] ?? bucket?.[hex.toUpperCase()];
      if (Array.isArray(arr)) {
        for (const it of arr) {
          const text = typeof it?.name === "string" ? it.name : undefined;
          if (text) hits.push({ text, source: "openchain", meta: { filtered: it.filtered } });
        }
      }
    };

    // 优先顺序：先 4byte（长尾多），再 openchain（稳定/聚合）
    const steps = [try4byte, tryOpenchain];

    for (const step of steps) {
      try {
        await step();
      } catch (e) {
        if (!this.opts.continueOnError) throw e;
        // 小睡一下避免某些公网 API 触发瞬时限流连锁
        await sleep(10);
      }
      if (hits.length >= this.opts.maxHits) break;
    }

    // 去重 + 截断
    const uniqText = uniq(hits.map((h) => h.text));
    const out: SignatureHit[] = [];
    for (const t of uniqText.slice(0, this.opts.maxHits)) {
      // 保留第一个出现的 source/meta
      const first = hits.find((h) => h.text === t)!;
      out.push(first);
    }
    return out;
  }
}
