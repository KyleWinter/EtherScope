import { Interface, getAddress, isHexString, zeroPadValue } from "ethers";
import { ERC20_TRANSFER_TOPIC } from "../config/constants.js";
import { CallNode } from "../trace/types.js";
import { TokenTransfer } from "./types.js";

export function extractTokenTransfersFromCallTree(root: CallNode): TokenTransfer[] {
  const out: TokenTransfer[] = [];

  const walk = (n: CallNode) => {
    if (n.logs) {
      for (const l of n.logs) {
        const topic0 = (l.topics?.[0] ?? "0x").toLowerCase();
        if (topic0 === ERC20_TRANSFER_TOPIC && l.topics.length >= 3) {
          try {
            const from = getAddress(`0x${l.topics[1].slice(26)}`);
            const to = getAddress(`0x${l.topics[2].slice(26)}`);
            const value = BigInt(l.data);
            out.push({
              token: getAddress(l.address),
              from,
              to,
              value,
              callId: n.id
            });
          } catch {
            // ignore malformed
          }
        }
      }
    }
    n.children.forEach(walk);
  };

  walk(root);
  return out;
}
