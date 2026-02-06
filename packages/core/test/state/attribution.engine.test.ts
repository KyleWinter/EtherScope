import { describe, it, expect } from "vitest";
import { attributeBalances } from "../../src/state/attribution/engine.js";

describe("attributeBalances", () => {
  it("attributes ETH via call.value and ERC20 via Transfer logs", () => {
    const root: any = {
      id: "c0",
      from: "0xAaAa",
      to: "0xBbBb",
      value: "0x10",
      error: undefined,
      children: [
        {
          id: "c1",
          from: "0xBbBb",
          to: "0xCcCc",
          value: "0x05",
          error: undefined,
          children: []
        }
      ]
    };

    const logs: any[] = [
      {
        address: "0xToken1",
        topics: [
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
          "0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "0x000000000000000000000000bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        ],
        data: "0x0000000000000000000000000000000000000000000000000000000000000007",
        logIndex: 3
      }
    ];

    const out = attributeBalances({ callTreeRoot: root, receiptLogs: logs, chainId: 1 });

    const find = (kind: "native" | "erc20", tokenOrEmpty: string, addr: string) =>
      out.deltas.find((d) => {
        if (d.address !== addr) return false;
        if (d.asset.kind !== kind) return false;
        if (kind === "erc20") return (d.asset as any).token === tokenOrEmpty;
        return true;
      });

    // ETH: aaaa -16, bbbb +11, cccc +5
    expect(find("native", "", "0xaaaa")?.delta).toBe(-16n);
    expect(find("native", "", "0xbbbb")?.delta).toBe(11n);
    expect(find("native", "", "0xcccc")?.delta).toBe(5n);

    // ERC20: token1 aaaa -7, bbbb +7
    expect(find("erc20", "0xtoken1", "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")?.delta).toBe(-7n);
    expect(find("erc20", "0xtoken1", "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")?.delta).toBe(7n);
  });
});
