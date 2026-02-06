export type Severity = "info" | "low" | "medium" | "high" | "critical";

export interface SourceLoc {
  file?: string;
  startLine?: number;
  endLine?: number;
  startCol?: number;
  endCol?: number;
  snippet?: string;
}

export interface Finding {
  tool: "slither" | "mythril" | "custom";
  ruleId: string;          // 工具的 check id / SWC id / 自定义 rule id
  title: string;
  severity: Severity;
  confidence?: "low" | "medium" | "high";
  description?: string;
  recommendation?: string;

  locations: SourceLoc[];  // 允许多个位置（比如跨文件/跨函数）
  tags?: string[];         // ["reentrancy", "access-control", ...]
  links?: string[];        // SWC / 文档链接
  raw?: unknown;           // 原始输出片段（便于 debug）
}
