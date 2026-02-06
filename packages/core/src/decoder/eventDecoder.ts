import { Interface, LogDescription } from "ethers";

export type DecodedLog = {
  address: string;
  topic0: string;
  name?: string;
  signature?: string;
  args?: unknown[];
};

export class EventDecoder {
  private iface: Interface;

  constructor(abi: any[]) {
    this.iface = new Interface(abi);
  }

  decodeLog(log: { address: string; topics: string[]; data: string }): DecodedLog {
    const topics = Array.isArray(log.topics) ? log.topics : [];
    const topic0 = (topics[0] ?? "0x").toLowerCase();

    try {
      // ethers v6: parseLog 可能返回 LogDescription | null（也可能 throw）
      const parsed: LogDescription | null = this.iface.parseLog({ topics, data: log.data });
      if (!parsed) return { address: log.address, topic0 };

      return {
        address: log.address,
        topic0,
        name: parsed.name,
        signature: parsed.signature,
        args: Array.from(parsed.args) as unknown[]
      };
    } catch {
      return { address: log.address, topic0 };
    }
  }
}
