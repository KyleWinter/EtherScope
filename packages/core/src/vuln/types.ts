import { CallNode } from "../trace/types.js";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Evidence = {
  title: string;
  callPath: string[]; // call ids path from root to leaf
  notes?: string[];
};

export type Finding = {
  id: string;
  ruleId: string;
  title: string;
  severity: Severity;
  confidence: number; // 0..1
  description: string;
  evidence: Evidence[];
};

export type RuleContext = {
  root: CallNode;
  flat: CallNode[];
  // 可选：decoded 信息
  selectorOf?: (c: CallNode) => string | undefined;
  signatureOf?: (c: CallNode) => string | undefined;
};

export type Rule = {
  id: string;
  title: string;
  run(ctx: RuleContext): Finding[];
};
