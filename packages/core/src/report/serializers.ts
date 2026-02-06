import { AnalysisReport } from "./types.js";

export function toJson(report: AnalysisReport): string {
  return JSON.stringify(
    report,
    (_, v) => (typeof v === "bigint" ? v.toString() : v),
    2
  );
}
