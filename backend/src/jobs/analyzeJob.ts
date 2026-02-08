// backend/src/jobs/analyzeJob.ts

import type { Job } from "./queue";
import { queue } from "./queueInstance";
import { analyzeService } from "../services/analyzeService";
import { jobRepo } from "./jobRepo";
import { wsBus } from "../serverBus";
import { txRepo } from "../db/repo/txRepo";

export interface AnalyzeJobInput {
  txHash?: string;
  projectRoot: string;
  target: string;
  tools?: Array<"slither" | "mythril">;
  mode?: "local" | "docker";
  timeoutMs?: number;
}

/* =============================
   Enqueue
============================= */

export function enqueueAnalyze(input: AnalyzeJobInput) {
  const normalized = inputNormalize(input);
  const job = queue.enqueue("analyze", normalized);

  // DB 记录 queued
  jobRepo.create(job);

  return job;
}

/* =============================
   Worker Handler
============================= */

export function registerAnalyzeJobHandler() {
  queue.register<AnalyzeJobInput>("analyze", async (job: Job<AnalyzeJobInput>) => {
    jobRepo.markRunning(job.id);

    // Send initial status
    wsBus.publish(
      { type: "job:update", jobId: job.id, message: "Initializing analysis..." },
      { status: "running" }
    );

    try {
      const normalized = inputNormalize(job.input);

      // Scanning phase
      wsBus.publish(
        { type: "job:update", jobId: job.id, message: `Scanning project at ${normalized.projectRoot}...` },
        { status: "running" }
      );

      // Running analysis
      const tools = normalized.tools?.join(", ") || "slither";
      wsBus.publish(
        { type: "job:update", jobId: job.id, message: `Running ${tools} analysis...` },
        { status: "running" }
      );

      const { reportId, findings } = await analyzeService.run(normalized);

      // Processing results
      wsBus.publish(
        { type: "job:update", jobId: job.id, message: `Processing ${findings.length} findings...` },
        { status: "running" }
      );

      /* ---------- DB ---------- */

      jobRepo.markSucceeded(job.id, { reportId });

      if (normalized.txHash) {
        txRepo.upsertTxReport(normalized.txHash, reportId);
      }

      /* ---------- WS ---------- */

      wsBus.publish(
        { type: "job:update", jobId: job.id, message: `Analysis complete! Found ${findings.length} issues.` },
        { status: "running" }
      );

      wsBus.publish(
        { type: "job:done", jobId: job.id, reportId },
        { status: "succeeded", reportId }
      );

    } catch (err: any) {
      const msg =
        typeof err?.message === "string"
          ? err.message
          : String(err);

      jobRepo.markFailed(job.id, msg);

      wsBus.publish(
        { type: "job:done", jobId: job.id, error: msg },
        { status: "failed", error: msg }
      );

      throw err; // 让 queue 记录 failed event
    }
  });

  /* =============================
     Queue Failed Event
     （只做日志 / WS，不再写 DB）
  ============================= */

  queue.on("failed", (job: Job) => {
    wsBus.publish(
      { type: "job:update", jobId: job.id },
      { status: "failed", error: job.error }
    );
  });
}

/* =============================
   Normalize
============================= */

function inputNormalize(input: AnalyzeJobInput): AnalyzeJobInput {
  return {
    ...input,
    target: input.target || "contracts",
    timeoutMs: input.timeoutMs ?? 300000
  };
}
