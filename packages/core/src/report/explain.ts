import { TraceParseResult } from "../trace/types.js";
import { TokenTransfer } from "../state/types.js";
import { lookup4byteSignature } from "../decoder/signatureLookup.js";

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

function safeSig(selector?: string): string | undefined {
  if (!selector) return undefined;
  try {
    // 你们 signatureLookup 已经有测试了；这里做 best-effort
    const sig = lookup4byteSignature(selector);
    return sig ?? undefined;
  } catch {
    return undefined;
  }
}

export type CallExplain = {
  callId: string;
  type?: string;
  from?: string;
  to?: string;
  selector?: string;
  signature?: string; // e.g. transfer(address,uint256)
};

export type TransferExplain = {
  token: string;
  from: string;
  to: string;
  value: string; // bigint string
  callId?: string;
  call?: CallExplain;
  human: string;
};

export type ReportExplanations = {
  callsById: Record<string, CallExplain>;
  transfers: TransferExplain[];
};

/**
 * 生成给报告用的“可读解释信息”：
 * - callId -> (to, selector, signature)
 * - 每条 TokenTransfer -> human string
 */
export function buildExplanations(trace: TraceParseResult, transfers: TokenTransfer[]): ReportExplanations {
  const callsById: Record<string, CallExplain> = {};

  // 先把 callId -> call 信息建好
  for (const c of trace.flat) {
    const sel = selectorOfInput(c.input);
    callsById[c.id] = {
      callId: c.id,
      type: c.type,
      from: c.from,
      to: c.to,
      selector: sel,
      signature: safeSig(sel)
    };
  }

  const explainedTransfers: TransferExplain[] = transfers.map((t) => {
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
