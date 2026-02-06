import { describe, it, expect } from "vitest";
import http from "node:http";
import { RpcClient, RpcError } from "../../src/providers/rpcClient.js";

function startRpcServer(handler: (body: any, reqCount: number) => any | Promise<any>) {
  let count = 0;

  const server = http.createServer(async (req, res) => {
    count += 1;

    // 关键：避免 keep-alive 导致 fetch 偶发挂起
    res.setHeader("Connection", "close");

    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end("Method Not Allowed");
      return;
    }

    let raw = "";
    req.setEncoding("utf8");

    req.on("error", (err) => {
      res.statusCode = 400;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end(`Request error: ${String(err)}`);
    });

    res.on("error", () => {
      // ignore response stream errors in tests
    });

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
      const url = `http://127.0.0.1:${addr.port}`;
      resolve({
        url,
        close: () =>
          new Promise<void>((r) => {
            server.close(() => r());
          })
      });
    });
  });
}

describe("RpcClient", () => {
  it(
    "supports batchCall and preserves order",
    async () => {
      const srv = await startRpcServer((body) => {
        const reqs = Array.isArray(body) ? body : [body];
        return reqs.map((r: any) => ({
          jsonrpc: "2.0",
          id: r.id,
          result: `${r.method}:${JSON.stringify(r.params)}`
        }));
      });

      try {
        const rpc = new RpcClient({
          url: srv.url,
          timeoutMs: 2000,
          retry: { retries: 0, baseDelayMs: 10, jitterMs: 0 }
        });

        const out = await rpc.batchCall<string>([
          { method: "a", params: [1] },
          { method: "b", params: ["x"] }
        ]);

        expect(out[0]).toBe("a:[1]");
        expect(out[1]).toBe('b:["x"]');
      } finally {
        await srv.close();
      }
    },
    10_000
  );

  it("retries on transient failure", async () => {
    const srv = await startRpcServer((_body, reqCount) => {
      if (reqCount === 1) {
        // fail first request hard (server responds 500)
        throw new Error("boom");
      }
      return [{ jsonrpc: "2.0", id: 1, result: "ok" }];
    });

    try {
      const rpc = new RpcClient({
        url: srv.url,
        timeoutMs: 2000,
        retry: { retries: 2, baseDelayMs: 10, jitterMs: 0 }
      });

      const v = await rpc.call<string>("hello", []);
      expect(v).toBe("ok");
    } finally {
      await srv.close();
    }
  });

  it(
    "throws RpcError when JSON-RPC error present",
    async () => {
      const srv = await startRpcServer((body) => {
        const req = Array.isArray(body) ? body[0] : body;
        return { jsonrpc: "2.0", id: req.id, error: { code: -32000, message: "bad", data: { x: 1 } } };
      });

      try {
        const rpc = new RpcClient({
          url: srv.url,
          timeoutMs: 2000,
          retry: { retries: 0, baseDelayMs: 10, jitterMs: 0 }
        });

        await expect(rpc.call("x", [])).rejects.toBeInstanceOf(RpcError);
      } finally {
        await srv.close();
      }
    },
    10_000
  );

  it("times out", async () => {
    const srv = await startRpcServer(async (body) => {
      // sleep longer than timeout
      await new Promise((r) => setTimeout(r, 200));
      const req = Array.isArray(body) ? body[0] : body;
      return { jsonrpc: "2.0", id: req.id, result: "late" };
    });

    try {
      const rpc = new RpcClient({
        url: srv.url,
        timeoutMs: 50,
        retry: { retries: 0, baseDelayMs: 10, jitterMs: 0 }
      });

      await expect(rpc.call("slow", [])).rejects.toBeTruthy();
    } finally {
      await srv.close();
    }
  });
});
