export type TokenTransfer = {
  token: string;
  from: string;
  to: string;
  value: bigint;
  callId?: string; // 可选：归因到哪个 call frame
};

export type BalanceChange = {
  address: string;
  deltaWei: bigint;
};

export type StorageDiffItem = {
  address: string;
  slot: string; // hex
  from?: string; // hex
  to?: string; // hex
};
