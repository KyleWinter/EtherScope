import { CallNode } from "../trace/types.js";
import { GasProfile } from "./types.js";

function sumBigint(xs: Array<bigint | undefined>): bigint {
  return xs.reduce<bigint>((acc, x) => acc + (x ?? 0n), 0n);
}

export function profileGas(
  root: CallNode,
  selectorOf?: (call: CallNode) => string | undefined
): GasProfile {
  const byCall: GasProfile["byCall"] = [];

  const walk = (n: CallNode) => {
    const childGas = sumBigint(n.children.map((c) => c.gasUsed));
    const gasUsed = n.gasUsed ?? 0n;
    const selfGasUsed = gasUsed >= childGas ? gasUsed - childGas : gasUsed;

    const selector = selectorOf?.(n);
    byCall.push({
      callId: n.id,
      contract: n.to,
      selector,
      gasUsed,
      selfGasUsed
    });

    n.children.forEach(walk);
  };

  walk(root);

  const byContractMap = new Map<string, bigint>();
  const bySelectorMap = new Map<string, bigint>();

  for (const b of byCall) {
    const g = b.gasUsed ?? 0n; // ✅ TS-safe
    if (b.contract) byContractMap.set(b.contract, (byContractMap.get(b.contract) ?? 0n) + g);
    if (b.selector) bySelectorMap.set(b.selector, (bySelectorMap.get(b.selector) ?? 0n) + g);
  }

  const byContract = [...byContractMap.entries()]
    .map(([contract, gasUsed]) => ({ contract, gasUsed }))
    .sort((a, b) => (b.gasUsed > a.gasUsed ? 1 : -1));

  const bySelector = [...bySelectorMap.entries()]
    .map(([selector, gasUsed]) => ({ selector, gasUsed }))
    .sort((a, b) => (b.gasUsed > a.gasUsed ? 1 : -1));

  return { byCall, byContract, bySelector };
}
