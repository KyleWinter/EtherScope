import { describe, it, expect } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { Cache } from "../../src/providers/cache.js";

describe("Cache", () => {
  it("memoizes in memory", async () => {
    const c = new Cache({ maxEntries: 100, ttlMs: 60_000 });
    let calls = 0;

    const v1 = await c.getOrSet("k1", async () => {
      calls += 1;
      return { n: 1 };
    });

    const v2 = await c.getOrSet("k1", async () => {
      calls += 1;
      return { n: 2 };
    });

    expect(v1).toEqual({ n: 1 });
    expect(v2).toEqual({ n: 1 });
    expect(calls).toBe(1);
  });

  it("persists to disk when diskDir enabled", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "core-cache-"));
    try {
      const c1 = new Cache({ diskDir: dir, ttlMs: 60_000 });
      let calls = 0;

      const v1 = await c1.getOrSet("disk_key", async () => {
        calls += 1;
        return { ok: true };
      });
      expect(v1).toEqual({ ok: true });
      expect(calls).toBe(1);

      // new cache instance should read from disk without calling loader
      const c2 = new Cache({ diskDir: dir, ttlMs: 60_000 });
      const v2 = await c2.getOrSet("disk_key", async () => {
        calls += 1;
        return { ok: false };
      });

      expect(v2).toEqual({ ok: true });
      expect(calls).toBe(1);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
