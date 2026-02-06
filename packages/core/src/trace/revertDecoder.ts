import { AbiCoder, dataSlice, hexlify, toUtf8String } from "ethers";

export type RevertDecoded =
  | { kind: "ErrorString"; reason: string }
  | { kind: "Panic"; code: bigint; name?: string }
  | { kind: "CustomError"; selector: string }
  | { kind: "Unknown"; data?: string };

const ERROR_STRING_SELECTOR = "0x08c379a0";
const PANIC_SELECTOR = "0x4e487b71";

export function decodeRevertData(data?: string): RevertDecoded {
  if (!data || data === "0x") return { kind: "Unknown" };
  const hex = hexlify(data);

  const sel = dataSlice(hex, 0, 4);
  if (sel === ERROR_STRING_SELECTOR) {
    try {
      const coder = AbiCoder.defaultAbiCoder();
      const encoded = dataSlice(hex, 4);
      const [reason] = coder.decode(["string"], encoded);
      return { kind: "ErrorString", reason: String(reason) };
    } catch {
      return { kind: "Unknown", data: hex };
    }
  }

  if (sel === PANIC_SELECTOR) {
    try {
      const coder = AbiCoder.defaultAbiCoder();
      const encoded = dataSlice(hex, 4);
      const [code] = coder.decode(["uint256"], encoded);
      const c = BigInt(code);
      const name = PANIC_CODE_NAMES.get(c);
      return { kind: "Panic", code: c, name };
    } catch {
      return { kind: "Unknown", data: hex };
    }
  }

  // custom error：只返回 selector（详细解码交给 ABI decoder）
  return { kind: "CustomError", selector: sel };
}

const PANIC_CODE_NAMES = new Map<bigint, string>([
  [0x01n, "assert(false) / generic"],
  [0x11n, "arithmetic overflow/underflow"],
  [0x12n, "divide by zero"],
  [0x21n, "invalid enum value"],
  [0x22n, "storage byte array incorrectly encoded"],
  [0x31n, "pop on empty array"],
  [0x32n, "array index out of bounds"],
  [0x41n, "memory overflow"],
  [0x51n, "zero-initialized function pointer"]
]);
