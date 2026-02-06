import { CallNode } from "../trace/types.js";

export type ReceiptLog = {
  address: string;
  topics: string[];
  data: string;
  logIndex?: number | string;
};

type TraceLog = {
  callId: string;
  seq: number; // 执行序
  address: string;
  topics: string[];
  data: string;
};

function normHex(x: string | undefined): string {
  if (!x) return "0x";
  const s = x.toLowerCase();
  return s.startsWith("0x") ? s : `0x${s}`;
}

function normAddr(x: string): string {
  return x.toLowerCase();
}

function parseLogIndex(x: any, fallback: number): number {
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    if (x.startsWith("0x")) return Number(BigInt(x));
    if (/^\d+$/.test(x)) return Number(x);
  }
  return fallback;
}

/**
 * 指纹：尽量“稳定 + 高区分度”
 * - address + topics + data（全部 lower）
 *
 * 注意：如果同一个 tx 里出现完全相同的 log（topic/data 一模一样）会冲突，
 * 我们靠“logIndex 顺序 + trace seq 顺序”来 disambiguate（见 match 逻辑）
 */
export function fingerprintLog(l: { address: string; topics: string[]; data: string }): string {
  const addr = normAddr(l.address);
  const topics = (l.topics ?? []).map((t) => normHex(t)).join(",");
  const data = normHex(l.data);
  return `${addr}|${topics}|${data}`;
}

/**
 * 将 callTree 内的 logs “按执行顺序”展平。
 * 经验上：callTracer 的 calls 顺序就是执行顺序；每个 frame 的 logs 顺序也是执行顺序。
 * 我们用 DFS（父->logs->children）生成一条全序列 seq。
 */
export function flattenTraceLogs(root: CallNode): TraceLog[] {
  const out: TraceLog[] = [];
  let seq = 0;

  const walk = (n: CallNode) => {
    if (Array.isArray(n.logs)) {
      for (const l of n.logs) {
        out.push({
          callId: n.id,
          seq: seq++,
          address: normAddr(l.address),
          topics: (l.topics ?? []).map((t) => normHex(t)),
          data: normHex(l.data ?? "0x")
        });
      }
    }
    for (const c of n.children) walk(c);
  };

  walk(root);
  return out;
}

/**
 * receipt logs -> callId 匹配
 *
 * 核心规则：
 * 1) 用 fingerprint 找候选 trace logs
 * 2) 用 “顺序” 消解重复：按 receipt 的 logIndex 递增匹配 trace 的 seq 递增
 * 3) 每条 trace log 只能使用一次（避免多对一）
 *
 * 返回：Map<txLogIndex, callId>
 */
export function matchReceiptLogsToCallIds(receiptLogs: ReceiptLog[], root: CallNode): Map<number, string> {
  const traceLogs = flattenTraceLogs(root);

  // fingerprint -> traceLog indices (ordered by seq)
  const buckets = new Map<string, TraceLog[]>();
  for (const tl of traceLogs) {
    const fp = fingerprintLog(tl);
    const arr = buckets.get(fp) ?? [];
    arr.push(tl);
    buckets.set(fp, arr);
  }
  for (const arr of buckets.values()) arr.sort((a, b) => a.seq - b.seq);

  const usedSeq = new Set<number>();
  const out = new Map<number, string>();

  // receipt logs in deterministic order
  const ordered = receiptLogs
    .map((l, i) => ({ l, idx: parseLogIndex(l.logIndex, i) }))
    .sort((a, b) => a.idx - b.idx);

  let lastSeq = -1;

  for (const { l, idx } of ordered) {
    const fp = fingerprintLog({
      address: l.address,
      topics: (l.topics ?? []).map((t) => normHex(t)),
      data: normHex(l.data ?? "0x")
    });

    const candidates = buckets.get(fp);
    if (!candidates || candidates.length === 0) continue;

    // 选最早的、未使用的、且 seq >= lastSeq（保持全局顺序）
    let picked: TraceLog | undefined;
    for (const c of candidates) {
      if (usedSeq.has(c.seq)) continue;
      if (c.seq < lastSeq) continue;
      picked = c;
      break;
    }

    // 如果严格顺序找不到，就退化：找任意未使用的（应对某些节点 trace 顺序不一致）
    if (!picked) {
      for (const c of candidates) {
        if (usedSeq.has(c.seq)) continue;
        picked = c;
        break;
      }
    }

    if (picked) {
      usedSeq.add(picked.seq);
      out.set(idx, picked.callId);
      lastSeq = Math.max(lastSeq, picked.seq);
    }
  }

  return out;
}
