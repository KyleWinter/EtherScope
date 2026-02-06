import { describe, it, expect } from "vitest";
import { AbiCoder } from "ethers";
import { decodeRevertData } from "../../src/trace/revertDecoder.js";

describe("revertDecoder", () => {
  it("decodes Error(string)", () => {
    const coder = AbiCoder.defaultAbiCoder();
    const encoded = coder.encode(["string"], ["nope"]);
    // selector 0x08c379a0 + encoded args
    const data = ("0x08c379a0" + encoded.slice(2)) as string;

    const r = decodeRevertData(data);
    expect(r.kind).toBe("ErrorString");
    if (r.kind === "ErrorString") expect(r.reason).toBe("nope");
  });

  it("decodes Panic(uint256)", () => {
    const coder = AbiCoder.defaultAbiCoder();
    const encoded = coder.encode(["uint256"], [0x12n]);
    const data = ("0x4e487b71" + encoded.slice(2)) as string;

    const r = decodeRevertData(data);
    expect(r.kind).toBe("Panic");
    if (r.kind === "Panic") expect(r.code).toBe(0x12n);
  });
});
