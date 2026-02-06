import { describe, it, expect } from "vitest";
import http from "node:http";
import { RpcClient } from "../../src/providers/rpcClient.js";
import { ReceiptProvider } from "../../src/providers/receipt.js";

function startRpcServer(handler: (body: any, reqCount: number) => any | Promise<any>) {
  let count = 0;

  const server = http.createServer(async (req, res) => {
    count += 1;

    // 避免 keep-alive 导致 node fetch 偶发挂起
    res.setHeader("Connection", "close");

    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (c) => (raw += c));
    req.on("end", async () => {
      try {
        const body = raw ? JSON.parse(raw) : null;
        const out = await handler(body, count);
        res.statusCode = 200;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.end(JSON.stringify(out));
      } catch (e: any) {
        res.statusCode = 500;
        res.setHeader("content-type", "text/plain; charset=utf-8");
        res.end(String(e?.message ?? e));
      }
    });
  });

  return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") throw new Error("bad address");
      resolve({
        url: `http://127.0.0.1:${addr.port}`,
        close: () => new Promise<void>((r) => server.close(() => r()))
      });
    });
  });
}

describe("ReceiptProvider", () => {
  it(
    "fetches receipt and normalizes logs",
    async () => {
      const srv = await startRpcServer((body) => {
        const req = Array.isArray(body) ? body[0] : body;

        // 确认确实调用了 receipt
        expect(req.method).toBe("eth_getTransactionReceipt");

        const txHash = req.params?.[0] ?? "0xTxHash";

        return {
          jsonrpc: "2.0",
          id: req.id,
          result: {
            transactionHash: txHash,
            status: "0x1",
            gasUsed: "0x5208",
            blockNumber: "0x10",
            logs: [
              {
                address: "0xToken",
                topics: ["0xAAA", "0xBBB"],
                data: "0x01",
                logIndex: "0x5"
              }
            ]
          }
        };
      });

      try {
        const rpc = new RpcClient({
          url: srv.url,
          timeoutMs: 2000,
          retry: { retries: 0, baseDelayMs: 10, jitterMs: 0 }
        });

        const rp = new ReceiptProvider(rpc);

        const receipt = await rp.getTransactionReceipt("0xTxHash");

        expect(receipt.transactionHash?.toLowerCase()).toBe("0xtxhash");
        expect(receipt.logs.length).toBe(1);

        expect(receipt.logs[0].address).toBe("0xtoken");
        expect(receipt.logs[0].topics[0]).toBe("0xaaa");
        expect(receipt.logs[0].data).toBe("0x01"); // 这里如果你在 provider 里 lowerCase，会变 "0x01"（本身不变）
        expect(receipt.logs[0].logIndex).toBe("0x5");
      } finally {
        await srv.close();
      }
    },
    10_000
  );
});
