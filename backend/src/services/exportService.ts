import { reportRepo } from "../db/repo/reportRepo";

export const exportService = {
  exportReportJson(reportId: string) {
    const r = reportRepo.getReport(reportId);
    if (!r) return null;
    return {
      id: r.id,
      txHash: r.tx_hash,
      createdAt: r.created_at,
      tools: JSON.parse(r.tools_json),
      findings: JSON.parse(r.findings_json)
    };
  }
};
