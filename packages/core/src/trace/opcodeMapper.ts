export type OpcodeCategory = "call" | "storage" | "arith" | "control" | "log" | "other";

export function categorizeOpcode(op: string): OpcodeCategory {
  const x = op.toUpperCase();
  if (x.includes("CALL") || x === "DELEGATECALL" || x === "STATICCALL") return "call";
  if (x.startsWith("SLOAD") || x.startsWith("SSTORE")) return "storage";
  if (x.startsWith("ADD") || x.startsWith("MUL") || x.startsWith("DIV") || x.startsWith("SUB")) return "arith";
  if (x.startsWith("JUMP") || x === "STOP" || x === "RETURN" || x === "REVERT") return "control";
  if (x.startsWith("LOG")) return "log";
  return "other";
}
