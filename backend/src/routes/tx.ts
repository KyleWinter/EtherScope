import type { Router } from "express";
import { txRepo } from "../db/repo/txRepo";
import { reportRepo } from "../db/repo/reportRepo";

export function registerTxRoutes(router: Router) {
  router.get("/tx/:hash/report", (req, res) => {
    const txHash = String(req.params.hash ?? "").trim();
    if (!txHash) return res.status(400).json({ ok: false, error: "missing tx hash" });

    const reportId = txRepo.getReportIdByTx(txHash);
    if (!reportId) return res.status(404).json({ ok: false, error: "report not found" });

    const report = reportRepo.getReport(reportId);
    if (!report) return res.status(404).json({ ok: false, error: "report not found" });

    res.json({
      ok: true,
      report: {
        id: report.id,
        txHash: report.tx_hash,
        createdAt: report.created_at,
        tools: JSON.parse(report.tools_json),
        findings: JSON.parse(report.findings_json)
      }
    });
  });
}
