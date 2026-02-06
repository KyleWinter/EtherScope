import { describe, it, expect } from "vitest";
import { extractTokenTransfers } from "../../src/state/tokenTransfers.js";

describe("extractTokenTransfers (receipt-first + callId attribution)", () => {
  it("extracts ERC20 transfers from receipt logs and fills callId via trace logs", () => {
    const root: any = {
      id: "c0",
      from: "0xaaaa",
      to: "0xbbbb",
      children: [
        {
          id: "c1",
          from: "0xbbbb",
          to: "0xcccc",
          logs: [
            {
              address: "0xToken1",
              topics: [
                "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
                "0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "0x000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
              ],
              data: "0x0000000000000000000000000000000000000000000000000000000000000007"
            }
          ],
          children: []
        }
      ]
    };

    const receiptLogs: any[] = [
      {
        address: "0xToken1",
        topics: [
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
          "0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "0x000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        ],
        data: "0x0000000000000000000000000000000000000000000000000000000000000007",
        logIndex: 5
      }
    ];

    const transfers = extractTokenTransfers({ receiptLogs, traceRoot: root });
    expect(transfers.length).toBe(1);

    const t = transfers[0];
    expect(t.token).toBe("0xtoken1");
    expect(t.from).toBe("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(t.to).toBe("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
    expect(t.value).toBe(7n);
    expect(t.callId).toBe("c1");
  });
});
