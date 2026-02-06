import { GasProfile } from "./types.js";

export type GasSuggestion = { kind: string; message: string };

export function gasHeuristics(profile: GasProfile): GasSuggestion[] {
  const out: GasSuggestion[] = [];

  const topContracts = profile.byContract.slice(0, 3);
  if (topContracts.length) {
    out.push({
      kind: "TopGasContracts",
      message: `Top gas contracts: ${topContracts.map((x) => `${x.contract}(${x.gasUsed} gas)`).join(", ")}`
    });
  }

  const topSelectors = profile.bySelector.slice(0, 3);
  if (topSelectors.length) {
    out.push({
      kind: "TopGasSelectors",
      message: `Top gas selectors: ${topSelectors.map((x) => `${x.selector}(${x.gasUsed})`).join(", ")}`
    });
  }

  return out;
}
