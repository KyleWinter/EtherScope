import type { Finding, Severity } from "@etherscope/core";
import type { SlitherOutput } from "./parseSlitherJson";

function impactToSeverity(impact?: string): Severity {
  switch ((impact ?? "").toLowerCase()) {
    case "high":
      return "high";
    case "medium":
      return "medium";
    case "low":
      return "low";
    case "informational":
    case "info":
      return "info";
    default:
      return "medium";
  }
}

function confidenceNorm(c?: string): "low" | "medium" | "high" | undefined {
  const v = (c ?? "").toLowerCase();
  if (v === "low" || v === "medium" || v === "high") return v;
  return undefined;
}

export function mapSlitherFindings(out: SlitherOutput): Finding[] {
  // Slither 常见路径：out.results.detectors
  const detectors: any[] = out?.results?.detectors ?? [];
  const findings: Finding[] = [];

  for (const d of detectors) {
    const ruleId = String(d?.check ?? "slither-unknown");
    const title = String(d?.description?.split("\n")?.[0] ?? d?.check ?? "Slither finding");

    const locations =
      (d?.elements ?? [])
        .map((el: any) => {
          const src = el?.source_mapping;
          return {
            file: src?.filename_absolute ?? src?.filename_relative ?? src?.filename,
            startLine: src?.lines?.[0],
            endLine: src?.lines?.[src?.lines?.length - 1]
          };
        })
        .filter((x: any) => x.file || x.startLine) ?? [];

    findings.push({
      tool: "slither",
      ruleId,
      title,
      severity: impactToSeverity(d?.impact),
      confidence: confidenceNorm(d?.confidence),
      description: typeof d?.description === "string" ? d.description : undefined,
      recommendation: undefined,
      locations: locations.length ? locations : [],
      tags: d?.check ? [String(d.check)] : undefined,
      links: undefined,
      raw: d
    });
  }

  return findings;
}
