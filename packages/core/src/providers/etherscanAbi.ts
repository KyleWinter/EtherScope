import { Cache } from "./cache.js";

export type EtherscanAbiClientOptions = {
  apiBase: string; // e.g. https://api.etherscan.io/api
  apiKey?: string;
  cache?: Cache;
};

export type VerifiedAbiResult =
  | { ok: true; abi: any[]; raw: string }
  | { ok: false; reason: string };

export class EtherscanAbiClient {
  constructor(private opts: EtherscanAbiClientOptions) {}

  async getVerifiedAbi(address: string): Promise<VerifiedAbiResult> {
    const a = address.toLowerCase();
    const key = `abi:etherscan:${this.opts.apiBase}:${a}`;
    if (this.opts.cache) return this.opts.cache.getOrSet(key, () => this.getVerifiedAbiUncached(a));
    return this.getVerifiedAbiUncached(a);
  }

  private async getVerifiedAbiUncached(address: string): Promise<VerifiedAbiResult> {
    const url = new URL(this.opts.apiBase);
    url.searchParams.set("module", "contract");
    url.searchParams.set("action", "getabi");
    url.searchParams.set("address", address);
    if (this.opts.apiKey) url.searchParams.set("apikey", this.opts.apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };

    const json = (await res.json()) as { status: string; message: string; result: string };

    if (json.status !== "1") return { ok: false, reason: `${json.message}: ${json.result}` };

    const raw = json.result;
    try {
      const abi = JSON.parse(raw);
      if (!Array.isArray(abi)) return { ok: false, reason: "ABI is not an array" };
      return { ok: true, abi, raw };
    } catch {
      return { ok: false, reason: "Failed to parse ABI JSON" };
    }
  }
}
