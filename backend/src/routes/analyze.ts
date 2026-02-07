// backend/src/routes/analyze.ts
import type { Router } from "express";
import { z } from "zod";
import { enqueueAnalyze } from "../jobs/analyzeJob";

// Minimal but product-ish schema:
// - projectRoot: optional, default to process.cwd()
// - txHash: optional (some runs may be "static-only" analysis)
// - If tools are provided, we require projectRoot (but we still default it)
// - Normalizes values so jobs don't need to guess
const AnalyzeReq = z
  .object({
    txHash: z.string().trim().optional(),

    // projectRoot is useful for static analyzers (slither/mythril).
    // Make it optional so tx-only analysis doesn't require it.
    projectRoot: z.string().trim().min(1).optional(),

    // Where contracts live relative to projectRoot
    target: z.string().trim().default("contracts"),

    // If omitted, backend can decide default tool set.
    tools: z.array(z.enum(["slither", "mythril"])).optional(),

    // Execution mode for tools
    mode: z.enum(["local", "docker"]).optional(),

    // Optional timeout for external tools
    timeoutMs: z.number().int().positive().optional()
  })
  .superRefine((v, ctx) => {
    // If tools are specified, it's a "static analysis" request.
    // We don't strictly need projectRoot if we default it, but if caller explicitly passes empty string,
    // zod min(1) already catches that. This check helps readability + future changes.
    const wantsStatic = (v.tools?.length ?? 0) > 0;
    if (wantsStatic && v.projectRoot === undefined) {
      // Not an error: we will default to cwd.
      // Keep this refine as a hook if later you want to require projectRoot for remote execution.
    }

    // Basic tx hash sanity check when provided.
    if (v.txHash) {
      const s = v.txHash;
      const looksLikeHash = /^0x[0-9a-fA-F]{64}$/.test(s);
      // Allow placeholder "0x..." in demo mode; comment out if you want strict validation.
      const isPlaceholder = s === "0x..." || s === "0x…";
      if (!looksLikeHash && !isPlaceholder) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["txHash"],
          message: "Invalid txHash. Expect 0x-prefixed 32-byte hex (64 hex chars)."
        });
      }
    }
  });

export function registerAnalyzeRoutes(router: Router) {
  router.post("/analyze", async (req, res) => {
    const parsed = AnalyzeReq.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    }

    // Normalize defaults here so jobs layer can stay dumb.
    const data = {
      ...parsed.data,
      projectRoot: parsed.data.projectRoot ?? process.cwd()
    };

    const job = enqueueAnalyze(data);
    return res.json({ ok: true, jobId: job.id });
  });
}
