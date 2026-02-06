import type { Router } from "express";
import { z } from "zod";
import { enqueueAnalyze } from "../jobs/analyzeJob";

const AnalyzeReq = z.object({
  txHash: z.string().trim().optional(),
  // projectRoot 是本机路径：demo 用。未来可以扩展为上传源码或拉 git。
  projectRoot: z.string().trim().min(1),
  target: z.string().trim().default("contracts"),
  tools: z.array(z.enum(["slither", "mythril"])).optional(),
  mode: z.enum(["local", "docker"]).optional(),
  timeoutMs: z.number().int().positive().optional()
});

export function registerAnalyzeRoutes(router: Router) {
  router.post("/analyze", async (req, res) => {
    const parsed = AnalyzeReq.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    }

    const job = enqueueAnalyze(parsed.data);
    res.json({ ok: true, jobId: job.id });
  });
}
