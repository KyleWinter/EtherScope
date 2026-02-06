import { describe, it, expect } from "vitest";
import { extractTokenTransfersFromCallTree } from "../src/state/tokenTransfers.js";
import { ERC20_TRANSFER_TOPIC } from "../src/config/constants.js";
import { CallNode } from "../src/trace/types.js";

describe("tokenTransfers", () => {
  it("extracts ERC20 Transfer logs", () => {
    const root: CallNode = {
      id: "c0",
      type: "CALL",
      from: "0x1111111111111111111111111111111111111111" as any,
      to: "0x2222222222222222222222222222222222222222" as any,
      depth: 0,
      children: [],
      logs: [
        {
          address: "0x9999999999999999999999999999999999999999" as any,
          topics: [
            ERC20_TRANSFER_TOPIC as any,
            ("0x" + "0".repeat(24) + "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa") as any,
            ("0x" + "0".repeat(24) + "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb") as any
          ],
          data: "0x10" as any
        }
      ]
    };

    const ts = extractTokenTransfersFromCallTree(root);
    expect(ts.length).toBe(1);
    expect(ts[0].value).toBe(16n);
  });
});
