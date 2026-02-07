// backend/src/db/repo/txRepo.ts

import { getDb, nowIso } from "../client";

export const txRepo = {
  /* ========= TX → REPORT ========= */

  upsertTxReport(txHash: string, reportId: string) {
    const db = getDb();
    const ts = nowIso();

    db.prepare(`
      INSERT INTO tx_reports (tx_hash, report_id, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(tx_hash)
      DO UPDATE SET
        report_id=excluded.report_id,
        updated_at=excluded.updated_at
    `).run(txHash, reportId, ts);
  },

  getReportIdByTx(txHash: string): string | null {
    const db = getDb();

    const row = db.prepare(`
      SELECT report_id FROM tx_reports WHERE tx_hash=?
    `).get(txHash) as { report_id: string } | undefined;

    return row?.report_id ?? null;
  }
};
