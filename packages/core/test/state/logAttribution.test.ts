import { describe, it, expect } from "vitest";
import { matchReceiptLogsToCallIds } from "../../src/state/logAttribution.js";
import { extractTokenTransfersFromReceiptLogs } from "../../src/state/tokenTransfersFromReceipt.js";

describe("log attribution: receipt log -> callId", () => {
  it("matches receipt Transfer logs back to call frames by fingerprint + order", () => {
    // synthetic call tree with logs on different frames
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
        },
        {
          id: "c2",
          from: "0xbbbb",
          to: "0xdddd",
          logs: [
            {
              address: "0xToken1",
              topics: [
                "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
                "0x000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                "0x000000000000000000000000cccccccccccccccccccccccccccccccccccccccc"
              ],
              data: "0x0000000000000000000000000000000000000000000000000000000000000005"
            }
          ],
          children: []
        }
      ]
    };

    // receipt logs with logIndex order
    const receiptLogs: any[] = [
      {
        address: "0xToken1",
        topics: [
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
          "0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "0x000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        ],
        data: "0x0000000000000000000000000000000000000000000000000000000000000007",
        logIndex: 10
      },
      {
        address: "0xToken1",
        topics: [
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
          "0x000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          "0x000000000000000000000000cccccccccccccccccccccccccccccccccccccccc"
        ],
        data: "0x0000000000000000000000000000000000000000000000000000000000000005",
        logIndex: 11
      }
    ];

    const m = matchReceiptLogsToCallIds(receiptLogs, root);
    expect(m.get(10)).toBe("c1");
    expect(m.get(11)).toBe("c2");

    const transfers = extractTokenTransfersFromReceiptLogs(receiptLogs, root);
    expect(transfers.length).toBe(2);
    expect(transfers[0].callId).toBe("c1");
    expect(transfers[1].callId).toBe("c2");
  });

  it("handles identical logs by using order", () => {
    // identical Transfer emitted twice in two frames
    const root: any = {
      id: "c0",
      from: "0x",
      to: "0x",
      logs: [],
      children: [
        {
          id: "c1",
          from: "0x",
          to: "0x",
          logs: [
            {
              address: "0xToken1",
              topics: [
                "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
                "0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "0x000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
              ],
              data: "0x01"
            }
          ],
          children: []
        },
        {
          id: "c2",
          from: "0x",
          to: "0x",
          logs: [
            {
              address: "0xToken1",
              topics: [
                "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
                "0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "0x000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
              ],
              data: "0x01"
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
        data: "0x01",
        logIndex: 0
      },
      {
        address: "0xToken1",
        topics: [
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
          "0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "0x000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        ],
        data: "0x01",
        logIndex: 1
      }
    ];

    const m = matchReceiptLogsToCallIds(receiptLogs, root);
    expect(m.get(0)).toBe("c1");
    expect(m.get(1)).toBe("c2");
  });
});
