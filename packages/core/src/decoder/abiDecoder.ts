import { Interface, dataSlice, hexlify, FunctionFragment } from "ethers";

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

    // hexlify 会把各种 BytesLike 归一化成 0x...；对 string 也安全
    const hex = hexlify(input);
    const selector = dataSlice(hex, 0, 4);

    try {
      // ethers v6: getFunction 可能返回 FunctionFragment | null（或 throw）
      const frag: FunctionFragment | null = this.iface.getFunction(selector);
      if (!frag) return { selector }; // selector 存在但 ABI 里没匹配到

      const decoded = this.iface.decodeFunctionData(frag, hex);

      return {
        selector,
        signature: frag.format(), // "transfer(address,uint256)"
        name: frag.name,
        args: Array.from(decoded) as unknown[]
      };
    } catch {
      // 任何 decode/ABI mismatch 都降级为“只返回 selector”
      return { selector };
    }
  }

  hasSelector(selector: string): boolean {
    try {
      const frag: FunctionFragment | null = this.iface.getFunction(selector);
      return Boolean(frag);
    } catch {
      return false;
    }
  }

  getInterface(): Interface {
    return this.iface;
  }
}
