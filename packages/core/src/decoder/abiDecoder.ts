import { Interface, dataSlice, getBytes, hexlify } from "ethers";

export type DecodedCall = {
  selector: string; // 0x....
  signature?: string; // transfer(address,uint256)
  name?: string; // transfer
  args?: unknown[];
};

export class AbiDecoder {
  private iface: Interface;

  constructor(abi: any[]) {
    this.iface = new Interface(abi);
  }

  decodeCalldata(input?: string): DecodedCall | undefined {
    if (!input || input === "0x" || input.length < 10) return undefined;
    const hex = hexlify(input);
    const selector = dataSlice(hex, 0, 4);
    try {
      const frag = this.iface.getFunction(selector);
      const decoded = this.iface.decodeFunctionData(frag, hex);
      return {
        selector,
        signature: frag.format(),
        name: frag.name,
        args: Array.from(decoded)
      };
    } catch {
      return { selector };
    }
  }

  hasSelector(selector: string): boolean {
    try {
      this.iface.getFunction(selector);
      return true;
    } catch {
      return false;
    }
  }

  getInterface(): Interface {
    return this.iface;
  }
}
