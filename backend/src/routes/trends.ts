import type { Router } from "express";
import { getAccountTxs } from "../services/etherscanService";

export function registerTrendsRoutes(router: Router) {
  router.get("/trends", async (req, res) => {
    const contract = String(req.query.contract ?? "").trim();
    if (!contract) return res.status(400).json({ ok: false, error: "missing contract" });

    const limit = Math.min(Number(req.query.limit ?? "200"), 500);

    try {
      // Fetch real transaction history from Etherscan
      const txs = await getAccountTxs(contract, 1, limit);

      if (!Array.isArray(txs)) {
        return res.json({ ok: true, contract, rows: [] });
      }

      const rows = txs.map((tx: any) => ({
        txHash: tx.hash,
        gasUsed: parseInt(tx.gasUsed, 10) || 0,
        timestamp: parseInt(tx.timeStamp, 10) || 0,
        functionName: tx.functionName || undefined,
      }));

      res.json({ ok: true, contract, rows });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });
}
