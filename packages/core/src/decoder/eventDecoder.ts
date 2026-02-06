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
    const topic0 = (log.topics?.[0] ?? "0x").toLowerCase();
    try {
      const parsed: LogDescription = this.iface.parseLog({ topics: log.topics, data: log.data });
      return {
        address: log.address,
        topic0,
        name: parsed.name,
        signature: parsed.signature,
        args: Array.from(parsed.args)
      };
    } catch {
      return { address: log.address, topic0 };
    }
  }
}
