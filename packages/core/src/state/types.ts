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

export type AssetId =
  | { kind: "native" } // ETH / BNB / MATIC 等
  | { kind: "erc20"; token: string };

export type AssetBalanceChange = {
  asset: AssetId;
  address: string;
  delta: bigint; // native: wei, erc20: token base units
  // 可选：证据链（报告可视化/溯源用）
  evidence?: Array<
    | { type: "callValue"; callId: string }
    | { type: "erc20Transfer"; token: string; callId?: string }
  >;
};
