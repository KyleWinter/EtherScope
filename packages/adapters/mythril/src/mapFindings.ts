import type { Finding, Severity } from "@etherscope/core";
import type { MythrilOutput } from "./parseMythrilJson";

function toNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function sevFromMythril(sev?: string): Severity {
  switch ((sev ?? "").toLowerCase()) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "medium":
      return "medium";
    case "low":
      return "low";
    case "info":
    case "informational":
      return "info";
    default:
      return "medium";
  }
}

function swcLink(swc?: string): string | undefined {
  const id = (swc ?? "").trim();
  if (!id) return undefined;
  return `https://swcregistry.io/docs/SWC-${id.replace(/^SWC-?/i, "")}`;
}

export function mapMythrilFindings(out: MythrilOutput): Finding[] {
  const issues: any[] = (out as any)?.issues ?? (out as any)?.results?.issues ?? [];
  const findings: Finding[] = [];

  for (const it of issues) {
    const swcId = it?.swcID ?? it?.swc_id ?? it?.swc;
    const ruleId = swcId ? String(swcId) : String(it?.title ?? "mythril-issue");
    const title = String(it?.title ?? "Mythril finding");

    const locations: Finding["locations"] = [];

    const loc = it?.locations?.[0] ?? it?.location;
    if (loc) {
      locations.push({
        file: loc?.sourceMap?.filename ?? loc?.filename ?? loc?.file,
        startLine: toNum(loc?.lineno ?? loc?.line),
        endLine: toNum(loc?.endline ?? loc?.endLine),
        startCol: toNum(loc?.column ?? loc?.col),
        endCol: toNum(loc?.endColumn ?? loc?.endCol),
        snippet: loc?.snippet
      });
    }

    const link = swcId ? swcLink(String(swcId)) : undefined;

    findings.push({
      tool: "mythril",
      ruleId,
      title,
      severity: sevFromMythril(it?.severity),
      confidence: undefined,
      description: it?.description ?? it?.extra?.description,
      recommendation: it?.extra?.recommendation,
      locations,
      tags: swcId ? ["SWC"] : undefined,
      links: link ? [link] : undefined,
      raw: it
    });
  }

  return findings;
}
