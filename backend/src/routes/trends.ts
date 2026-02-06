import type { Router } from "express";
import { trendsRepo } from "../db/repo/trendsRepo";

export function registerTrendsRoutes(router: Router) {
  router.get("/trends", (req, res) => {
    const contract = String(req.query.contract ?? "").trim();
    if (!contract) return res.status(400).json({ ok: false, error: "missing contract" });

    const limit = Math.min(Number(req.query.limit ?? "200"), 500);
    const rows = trendsRepo.query(contract, limit);

    res.json({ ok: true, contract, rows });
  });
}
