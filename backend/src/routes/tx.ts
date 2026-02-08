// backend/src/routes/tx.ts
import type { Router } from "express";
import { txRepo } from "../db/repo/txRepo";
import { reportRepo } from "../db/repo/reportRepo";
import { jobRepo } from "../jobs/jobRepo";

function isTxHash(s: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(s);
}

export function registerTxRoutes(router: Router) {
  // Get report by reportId directly
  router.get("/report/:reportId", (req, res) => {
    const reportId = String(req.params.reportId ?? "").trim();

    if (!reportId) {
      return res.status(400).json({ ok: false, error: "missing report ID" });
    }

    const report = reportRepo.getReport(reportId);
    if (!report) {
      return res.status(404).json({
        ok: false,
        error: "report not found"
      });
    }

    let tools: unknown = {};
    let findings: unknown = [];
    try {
      tools = report.tools_json ? JSON.parse(report.tools_json) : {};
    } catch {
      tools = {};
    }
    try {
      findings = report.findings_json ? JSON.parse(report.findings_json) : [];
    } catch {
      findings = [];
    }

    return res.json({
      ok: true,
      report: {
        id: report.id,
        txHash: report.tx_hash,
        createdAt: report.created_at,
        tools,
        findings
      }
    });
  });

  router.get("/tx/:hash/report", (req, res) => {
    const txHash = String(req.params.hash ?? "").trim();

    if (!txHash) {
      return res.status(400).json({ ok: false, error: "missing tx hash" });
    }
    if (txHash !== "0x..." && txHash !== "0x…" && !isTxHash(txHash)) {
      return res.status(400).json({ ok: false, error: "invalid tx hash" });
    }

    const reportId = txRepo.getReportIdByTx(txHash);

    // ✅ report not ready -> check jobs table and return status
    if (!reportId) {
      const job = jobRepo.findLatestByTxHash(txHash);

      if (job) {
        // succeeded but tx_reports mapping not committed yet (rare race) -> tell client to retry
        if (job.status === "succeeded") {
          return res.status(202).json({
            ok: true,
            status: "succeeded",
            jobId: job.id,
            hint: "Job succeeded; report mapping may not be committed yet. Retry in a moment."
          });
        }

        return res.status(202).json({
          ok: true,
          status: job.status,
          jobId: job.id,
          error: job.error
        });
      }

      return res.status(404).json({
        ok: false,
        error: "report not found",
        hint: "If you just submitted /analyze, wait a moment and retry."
      });
    }

    const report = reportRepo.getReport(reportId);
    if (!report) {
      return res.status(404).json({
        ok: false,
        error: "report not found",
        hint: "Report id exists but record is missing; check DB consistency."
      });
    }

    let tools: unknown = [];
    let findings: unknown = [];
    try {
      tools = report.tools_json ? JSON.parse(report.tools_json) : [];
    } catch {
      tools = [];
    }
    try {
      findings = report.findings_json ? JSON.parse(report.findings_json) : [];
    } catch {
      findings = [];
    }

    return res.json({
      ok: true,
      report: {
        id: report.id,
        txHash: report.tx_hash,
        createdAt: report.created_at,
        tools,
        findings
      }
    });
  });
}
