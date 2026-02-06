import { describe, it, expect } from "vitest";
import http from "node:http";
import { SignatureLookup } from "../../src/decoder/signatureLookup.js";
import { Cache } from "../../src/providers/cache.js";

function startServer(handler: (req: http.IncomingMessage, body: string) => any | Promise<any>) {
  const server = http.createServer(async (req, res) => {
    res.setHeader("Connection", "close");

    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (c) => (raw += c));
    req.on("end", async () => {
      try {
        const out = await handler(req, raw);
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

describe("SignatureLookup", () => {
  it("looks up function selector via 4byte and openchain and dedups", async () => {
    const selector = "0xa9059cbb"; // transfer(address,uint256)

    const srv4 = await startServer((req) => {
      // 4byte: /api/v1/signatures/?hex_signature=0xa9059cbb
      if (!req.url?.startsWith("/api/v1/signatures/")) throw new Error("unexpected path");
      return {
        count: 2,
        results: [
          { id: 1, text_signature: "transfer(address,uint256)", hex_signature: selector },
          { id: 2, text_signature: "transfer(address,uint256)", hex_signature: selector }
        ]
      };
    });

    const srvOpen = await startServer((req) => {
      // openchain: /signature-database/v1/lookup?function=0xa9059cbb&filter=true
      if (!req.url?.startsWith("/signature-database/v1/lookup")) throw new Error("unexpected path");
      return {
        ok: true,
        result: {
          function: {
            [selector]: [{ name: "transfer(address,uint256)", filtered: false }, { name: "foo(uint256)", filtered: false }]
          },
          event: {}
        }
      };
    });

    try {
      const look = new SignatureLookup({
        fourByteBaseUrl: srv4.url,
        openchainBaseUrl: srvOpen.url,
        timeoutMs: 2000,
        maxHits: 5
      });

      const hits = await look.lookupFunction(selector);
      const texts = hits.map((h) => h.text);
      expect(texts).toContain("transfer(address,uint256)");
      expect(texts).toContain("foo(uint256)");
      // dedup: transfer 只出现一次
      expect(texts.filter((t) => t === "transfer(address,uint256)").length).toBe(1);
    } finally {
      await srv4.close();
      await srvOpen.close();
    }
  });

  it("caches lookups when cache provided", async () => {
    const selector = "0x12345678";
    let hitCount = 0;

    const srv4 = await startServer((_req) => {
      hitCount += 1;
      return { count: 1, results: [{ id: 1, text_signature: "hello(uint256)", hex_signature: selector }] };
    });

    try {
      const cache = new Cache({ maxEntries: 100, ttlMs: 60_000 });
      const look = new SignatureLookup({
        cache,
        fourByteBaseUrl: srv4.url,
        useOpenchain: false,
        timeoutMs: 2000
      });

      await look.lookupFunction(selector);
      await look.lookupFunction(selector);

      expect(hitCount).toBe(1);
    } finally {
      await srv4.close();
    }
  });

  it("validates selector/topic length", async () => {
    const look = new SignatureLookup({ use4byte: false, useOpenchain: false });
    await expect(look.lookupFunction("0x1234")).rejects.toBeTruthy();
    await expect(look.lookupEvent("0x1234")).rejects.toBeTruthy();
  });
});
