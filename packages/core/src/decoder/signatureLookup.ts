import { Cache } from "../providers/cache.js";

export type SignatureLookupOptions = {
  cache?: Cache;
  // 可选：在线查询函数（默认不启用，避免你们无意触网；CLI/Server 可自行注入）
  remoteLookup?: (selector: string) => Promise<string | undefined>;
};

export class SignatureLookup {
  constructor(private opts: SignatureLookupOptions = {}) {}

  async lookupSelector(selector4bytes: string): Promise<string | undefined> {
    const sel = selector4bytes.toLowerCase();
    const key = `sig:${sel}`;
    if (this.opts.cache) {
      return this.opts.cache.getOrSet(key, async () => (await this.opts.remoteLookup?.(sel)) ?? null) as any;
    }
    return this.opts.remoteLookup?.(sel);
  }
}
