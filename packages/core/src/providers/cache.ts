import { LRUCache } from "lru-cache";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export type CacheKey = string;

export type CacheOptions = {
  maxEntries?: number;
  ttlMs?: number;
  diskDir?: string; // 可选：落盘目录
};

export class Cache {
  private mem: LRUCache<CacheKey, unknown>;
  private ttlMs: number;
  private diskDir?: string;

  constructor(opts: CacheOptions = {}) {
    const maxEntries = opts.maxEntries ?? 5_000;
    this.ttlMs = opts.ttlMs ?? 10 * 60_000;
    this.diskDir = opts.diskDir;

    this.mem = new LRUCache<CacheKey, unknown>({
      max: maxEntries,
      ttl: this.ttlMs
    });
  }

  get<T>(key: CacheKey): T | undefined {
    return this.mem.get(key) as T | undefined;
  }

  set<T>(key: CacheKey, value: T): void {
    this.mem.set(key, value);
  }

  async getOrSet<T>(key: CacheKey, loader: () => Promise<T>): Promise<T> {
    const hit = this.get<T>(key);
    if (hit !== undefined) return hit;

    if (this.diskDir) {
      const diskHit = await this.readDisk<T>(key);
      if (diskHit !== undefined) {
        this.set(key, diskHit);
        return diskHit;
      }
    }

    const v = await loader();
    this.set(key, v);
    if (this.diskDir) await this.writeDisk(key, v);
    return v;
  }

  private filePath(key: string): string {
    const safe = key.replace(/[^a-zA-Z0-9._-]/g, "_");
    return path.join(this.diskDir!, `${safe}.json`);
  }

  private async readDisk<T>(key: string): Promise<T | undefined> {
    try {
      const fp = this.filePath(key);
      const stat = await fs.stat(fp);
      const age = Date.now() - stat.mtimeMs;
      if (age > this.ttlMs) return undefined;
      const raw = await fs.readFile(fp, "utf8");
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  private async writeDisk<T>(key: string, value: T): Promise<void> {
    try {
      await fs.mkdir(this.diskDir!, { recursive: true });
      await fs.writeFile(this.filePath(key), JSON.stringify(value), "utf8");
    } catch {
      // 磁盘缓存失败不影响主流程
    }
  }
}
