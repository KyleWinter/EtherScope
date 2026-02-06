import type { Job } from "./queue";
import { queue } from "./queueInstance";
import { analyzeService } from "../services/analyzeService";
import { jobRepo } from "./jobRepo";
import { wsBus } from "../serverBus";

export interface AnalyzeJobInput {
  txHash?: string;
  projectRoot: string;
  target: string;
  tools?: Array<"slither" | "mythril">;
  mode?: "local" | "docker";
  timeoutMs?: number;
}

export function enqueueAnalyze(input: AnalyzeJobInput) {
  const job = queue.enqueue("analyze", input);
  jobRepo.create(job);
  return job;
}

export function registerAnalyzeJobHandler() {
  queue.register<AnalyzeJobInput>("analyze", async (job: Job<AnalyzeJobInput>) => {
    jobRepo.markRunning(job.id);

    wsBus.publish({ type: "job:update", jobId: job.id }, { status: "running" });

    const { reportId } = await analyzeService.run(inputNormalize(job.input));

    jobRepo.markSucceeded(job.id, { reportId });
    wsBus.publish({ type: "job:done", jobId: job.id, reportId }, { status: "succeeded", reportId });
  });

  queue.on("failed", (job: Job) => {
    jobRepo.markFailed(job.id, job.error ?? "unknown error");
    wsBus.publish({ type: "job:done", jobId: job.id, error: job.error }, { status: "failed", error: job.error });
  });
}

function inputNormalize(input: AnalyzeJobInput): AnalyzeJobInput {
  return {
    ...input,
    target: input.target || "contracts",
    timeoutMs: input.timeoutMs ?? 300000
  };
}
