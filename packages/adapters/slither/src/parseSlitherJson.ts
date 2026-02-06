export interface ParseError {
  message: string;
  detail?: unknown;
}

export interface ParseResult<T> {
  ok: boolean;
  data?: T;
  error?: ParseError;
}

// Slither 输出 schema 版本会变，这里先用宽松结构：只要你 mapFindings 用到的字段在就行
export type SlitherOutput = any;

export function parseSlitherJson(jsonText: string): ParseResult<SlitherOutput> {
  try {
    const obj = JSON.parse(jsonText);
    return { ok: true, data: obj };
  } catch (e) {
    return {
      ok: false,
      error: { message: "Failed to parse Slither JSON", detail: e }
    };
  }
}
