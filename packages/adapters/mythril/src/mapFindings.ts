import type { Finding, Severity } from "@etherscope/core";
import type { MythrilOutput } from "./parseMythrilJson";

function sevFromMythril(sev?: string): Severity {
  switch ((sev ?? "").toLowerCase()) {
    case "high":
      return "high";
    case "medium":
      return "medium";
    case "low":
      return "low";
    case "critical":
      return "critical";
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
  // 常见 SWC 链接：swcregistry.io 或 github registry（不同源都行）
  return `https://swcregistry.io/docs/SWC-${id.replace(/^SWC-?/i, "")}`;
}

export function mapMythrilFindings(out: MythrilOutput): Finding[] {
  // mythril 常见结构：out.issues[]
  const issues: any[] = out?.issues ?? out?.results?.issues ?? [];
  const findings: Finding[] = [];

  for (const it of issues) {
    const swcId = it?.swcID ?? it?.swc_id ?? it?.swc;
    const ruleId = swcId ? String(swcId) : String(it?.title ?? "mythril-issue");
    const title = String(it?.title ?? "Mythril finding");
    const locations = [];

    const loc = it?.locations?.[0] ?? it?.location;
    if (loc) {
      locations.push({
        file: loc?.sourceMap?.filename ?? loc?.filename ?? loc?.file,
        startLine: loc?.lineno ?? loc?.line,
        startCol: loc?.column
      });
    }

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
      links: swcId ? [swcLink(String(swcId))!].filter(Boolean) : undefined,
      raw: it
    });
  }

  return findings;
}
