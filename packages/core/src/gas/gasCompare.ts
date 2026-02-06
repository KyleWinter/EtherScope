import { GasProfile } from "./types.js";

export type GasDiff = {
  contract: string;
  a: bigint;
  b: bigint;
  delta: bigint;
};

export function compareGasProfiles(a: GasProfile, b: GasProfile): GasDiff[] {
  const mapA = new Map(a.byContract.map((x) => [x.contract, x.gasUsed]));
  const mapB = new Map(b.byContract.map((x) => [x.contract, x.gasUsed]));
  const keys = new Set([...mapA.keys(), ...mapB.keys()]);

  return [...keys]
    .map((k) => {
      const va = mapA.get(k) ?? 0n;
      const vb = mapB.get(k) ?? 0n;
      return { contract: k, a: va, b: vb, delta: vb - va };
    })
    .sort((x, y) => (y.delta > x.delta ? 1 : -1));
}
