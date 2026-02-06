export type Hex = `0x${string}`;
export type Address = `0x${string}`;

export type CallType = "CALL" | "STATICCALL" | "DELEGATECALL" | "CALLCODE" | "CREATE" | "CREATE2" | "SELFDESTRUCT";

export type CallNode = {
  id: string; // stable id for UI / report
  type: CallType;
  from: Address;
  to?: Address;
  input?: Hex;
  output?: Hex;
  value?: Hex;
  gas?: bigint;
  gasUsed?: bigint;
  error?: string;
  revertReason?: string;

  depth: number;
  parentId?: string;
  children: CallNode[];

  // logs attached at this call frame (if tracer provides)
  logs?: Array<{ address: Address; topics: Hex[]; data: Hex }>;
};

export type TraceParseResult = {
  root: CallNode;
  flat: CallNode[];
};
