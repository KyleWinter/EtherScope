import { NormalizedTrace } from "../providers/debugTrace.js";
import { CallNode, TraceParseResult } from "./types.js";

function toBigint(x: any): bigint | undefined {
  if (x === undefined || x === null) return undefined;
  if (typeof x === "bigint") return x;
  if (typeof x === "number") return BigInt(x);
  if (typeof x === "string") {
    if (x.startsWith("0x")) return BigInt(x);
    // geth callTracer often returns decimal strings for gas/gasUsed/value
    if (/^\d+$/.test(x)) return BigInt(x);
  }
  return undefined;
}

function asHex(x: any): any {
  if (typeof x === "string" && x.startsWith("0x")) return x;
  return undefined;
}

export function parseTraceToCallTree(trace: NormalizedTrace): TraceParseResult {
  const flat: CallNode[] = [];
  let seq = 0;

  const walk = (n: NormalizedTrace, depth: number, parentId?: string): CallNode => {
    const id = `c${seq++}`;
    const node: CallNode = {
      id,
      type: (n.type ?? "CALL") as any,
      from: (n.from ?? "0x") as any,
      to: n.to as any,
      input: asHex(n.input),
      output: asHex(n.output),
      value: asHex(n.value),
      gas: toBigint(n.gas),
      gasUsed: toBigint(n.gasUsed),
      error: n.error,
      revertReason: n.revertReason,
      depth,
      parentId,
      children: [],
      logs: n.logs?.map((l) => ({
        address: l.address as any,
        topics: (l.topics ?? []) as any,
        data: (l.data ?? "0x") as any
      }))
    };

    flat.push(node);
    node.children = (n.calls ?? []).map((c) => walk(c, depth + 1, id));
    return node;
  };

  const root = walk(trace, 0);
  return { root, flat };
}
