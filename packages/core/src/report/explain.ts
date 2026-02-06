import type { TraceParseResult } from "../trace/types.js";
import type { TokenTransfer } from "../state/types.js";
import type { ReportExplanations } from "./types.js";
import { SignatureLookup } from "../decoder/signatureLookup.js";

/** 最小可读：截断地址 */
function shortAddr(a?: string): string {
  if (!a) return "0x";
  const s = a.toLowerCase();
  if (s.length <= 10) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function selectorOfInput(input?: string): string | undefined {
  if (!input) return undefined;
  const s = input.toLowerCase();
  if (!s.startsWith("0x") || s.length < 10) return undefined;
  return s.slice(0, 10);
}

/**
 * 纯同步版本：不做公网 signature lookup（适用于离线、测试、或不想被公网 API 卡住的场景）
 */
export function buildExplanations(trace: TraceParseResult, transfers: TokenTransfer[]): ReportExplanations {
  const callsById: ReportExplanations["callsById"] = {};

  for (const c of trace.flat) {
    const sel = selectorOfInput(c.input);
    callsById[c.id] = {
      callId: c.id,
      type: c.type,
      from: c.from,
      to: c.to,
      selector: sel
      // signature 留空
    };
  }

  const explainedTransfers: ReportExplanations["transfers"] = transfers.map((t) => {
    const call = t.callId ? callsById[t.callId] : undefined;

    const token = t.token.toLowerCase();
    const from = t.from.toLowerCase();
    const to = t.to.toLowerCase();

    const callPart = call
      ? `${call.callId} ${shortAddr(call.to)} ${call.signature ?? call.selector ?? ""}`.trim()
      : "unknown-call";

    const human = `Transfer ${shortAddr(token)}: ${shortAddr(from)} -> ${shortAddr(to)} (${t.value.toString()}) @ ${callPart}`;

    return {
      token,
      from,
      to,
      value: t.value.toString(),
      callId: t.callId,
      call,
      human
    };
  });

  return { callsById, transfers: explainedTransfers };
}

/**
 * 异步版本：把 selector -> signature 填上（通过 4byte/openchain）
 * - 对 trace 中出现过的 selector 去重后查询
 * - best-effort：网络失败不影响整体返回
 */
export async function buildExplanationsWithSignatures(
  trace: TraceParseResult,
  transfers: TokenTransfer[],
  sigLookup: SignatureLookup
): Promise<ReportExplanations> {
  const base = buildExplanations(trace, transfers);

  // 收集去重 selector
  const selectors = new Set<string>();
  for (const c of trace.flat) {
    const sel = base.callsById[c.id]?.selector;
    if (sel) selectors.add(sel);
  }

  // selector -> signature（只取第一条命中）
  const sigMap = new Map<string, string>();

  for (const sel of selectors) {
    try {
      const hits = await sigLookup.lookupFunction(sel); // ✅ 这里返回的是数组
      const sig = hits[0]?.text;
      if (sig) sigMap.set(sel, sig);
    } catch {
      // ignore network failures
    }
  }

  // 回填 callsById.signature
  for (const id of Object.keys(base.callsById)) {
    const ce = base.callsById[id];
    if (!ce.selector) continue;
    const sig = sigMap.get(ce.selector);
    if (sig) ce.signature = sig;
  }

  // 重新生成 human 字符串（因为 signature 变了）
  const rebuiltTransfers: ReportExplanations["transfers"] = base.transfers.map((t) => {
    const call = t.callId ? base.callsById[t.callId] : undefined;
    const callPart = call
      ? `${call.callId} ${shortAddr(call.to)} ${call.signature ?? call.selector ?? ""}`.trim()
      : "unknown-call";

    return {
      ...t,
      call,
      human: `Transfer ${shortAddr(t.token)}: ${shortAddr(t.from)} -> ${shortAddr(t.to)} (${t.value}) @ ${callPart}`
    };
  });

  return { callsById: base.callsById, transfers: rebuiltTransfers };
}
