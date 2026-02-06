export type GasBreakdown = {
  callId: string;
  contract?: string;
  selector?: string;
  gasUsed?: bigint;
  selfGasUsed?: bigint; // gasUsed - sum(child.gasUsed)
};

export type GasProfile = {
  byCall: GasBreakdown[];
  byContract: Array<{ contract: string; gasUsed: bigint }>;
  bySelector: Array<{ selector: string; gasUsed: bigint }>;
};
