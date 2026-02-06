import { describe, it, expect } from "vitest";
import { Cache } from "../../src/providers/cache.js";
import { DebugTracer } from "../../src/providers/debugTrace.js";

// 用 any 注入一个 fake rpc（TS 结构类型就能过）
function makeFakeRpc(returnValue: any) {
  let calls = 0;
  return {
    getCalls: () => calls,
    rpc: {
      call: async (_method: string, _params: any[]) => {
        calls += 1;
        return returnValue;
      }
    } as any
  };
}

describe("DebugTracer", () => {
  it("normalizes geth callTracer output and lowercases addresses/topics", async () => {
    const raw = {
      type: "CALL",
      from: "0xAABBcc",
      to: "0xDD0011",
      input: "0x1234",
      output: "0xabcd",
      gas: 12345, // number
      gasUsed: "21000", // decimal string
      value: "0x0",
      logs: [
        {
          address: "0xEEFF",
          topics: ["0xAA", "0xBB"],
          data: "0x"
        }
      ],
      calls: [
        {
          type: "DELEGATECALL",
          from: "0xDD0011",
          to: "0x9999",
          input: "0xdeadbeef",
          gas: "0x10",
          gasUsed: 16
        }
      ]
    };

    const { rpc } = makeFakeRpc(raw);
    const tracer = new DebugTracer(rpc, { flavor: "geth_callTracer", normalize: { lowerCaseAddress: true } });

    const t = await tracer.traceTransaction("0xhash");
    expect(t.from).toBe("0xaabbcc");
    expect(t.to).toBe("0xdd0011");
    expect(t.gas).toBe("12345");
    expect(t.gasUsed).toBe("21000");
    expect(t.logs?.[0].address).toBe("0xeeff");
    expect(t.logs?.[0].topics[0]).toBe("0xaa");
    expect(t.calls?.[0].type).toBe("DELEGATECALL");
    expect(t.calls?.[0].to).toBe("0x9999");
  });

  it("caches traceTransaction results when cache provided", async () => {
    const raw = { type: "CALL", from: "0x1" };
    const { rpc, getCalls } = makeFakeRpc(raw);

    const cache = new Cache({ maxEntries: 100, ttlMs: 60_000 });
    const tracer = new DebugTracer(rpc, { cache });

    await tracer.traceTransaction("0xabc");
    await tracer.traceTransaction("0xabc");

    expect(getCalls()).toBe(1);
  });
});
