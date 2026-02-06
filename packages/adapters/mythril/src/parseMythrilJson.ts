export interface ParseError {
  message: string;
  detail?: unknown;
}

export interface ParseResult<T> {
  ok: boolean;
  data?: T;
  error?: ParseError;
}

export type MythrilOutput = any;

export function parseMythrilJson(jsonText: string): ParseResult<MythrilOutput> {
  try {
    const obj = JSON.parse(jsonText);
    return { ok: true, data: obj };
  } catch (e) {
    return {
      ok: false,
      error: { message: "Failed to parse Mythril JSON", detail: e }
    };
  }
}
