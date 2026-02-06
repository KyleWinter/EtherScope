export type AssetId =
  | { kind: "native"; chainId?: number }
  | { kind: "erc20"; token: string };

export type EvidenceRef =
  | { type: "callValue"; callId: string }
  | { type: "erc20Transfer"; txLogIndex: number; token: string; callIdHint?: string };

export type BalanceDelta = {
  asset: AssetId;
  address: string;
  delta: bigint;
  evidence: EvidenceRef[];
};

export type Erc20Transfer = {
  token: string;
  from: string;
  to: string;
  amount: bigint;
  txLogIndex: number;
};
