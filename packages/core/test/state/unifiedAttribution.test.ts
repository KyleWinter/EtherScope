import { describe, it, expect } from "vitest";
import { buildUnifiedBalanceAttribution } from "../../src/state/unifiedAttribution.js";

describe("buildUnifiedBalanceAttribution", () => {
  it("produces ETH balanceChanges and unified assetDeltas", () => {
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

    const tokenTransfers = [
      { token: "0xToken1", from: "0xAaAa", to: "0xBbBb", value: 7n, callId: "c1" }
    ];

    const out = buildUnifiedBalanceAttribution(root, tokenTransfers);

    // old ETH-only field
    const eth = (addr: string) => out.ethBalanceChanges.find((x) => x.address === addr)?.deltaWei;
    expect(eth("0xaaaa")).toBe(-16n);
    expect(eth("0xbbbb")).toBe(11n);
    expect(eth("0xcccc")).toBe(5n);

    // unified
    const find = (kind: string, token: string | undefined, addr: string) =>
      out.assetDeltas.find((d) => {
        if (d.address !== addr) return false;
        if (d.asset.kind !== kind) return false;
        if (kind === "erc20") return (d.asset as any).token === token;
        return true;
      })?.delta;

    expect(find("native", undefined, "0xaaaa")).toBe(-16n);
    expect(find("erc20", "0xtoken1", "0xaaaa")).toBe(-7n);
    expect(find("erc20", "0xtoken1", "0xbbbb")).toBe(7n);
  });
});
