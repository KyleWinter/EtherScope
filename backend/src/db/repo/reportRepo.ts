import { getDb, nowIso } from "../client";

export interface StoredReport {
  id: string;
  tx_hash: string | null;
  created_at: string;
  tools_json: string;
  findings_json: string;
}

export const reportRepo = {
  createReport(input: {
    id: string;
    txHash?: string;
    tools: unknown;
    findings: unknown;
  }) {
    const db = getDb();
    db.prepare(
      `INSERT INTO reports (id, tx_hash, created_at, tools_json, findings_json)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      input.id,
      input.txHash ?? null,
      nowIso(),
      JSON.stringify(input.tools ?? {}),
      JSON.stringify(input.findings ?? [])
    );
  },

  getReport(reportId: string): StoredReport | null {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM reports WHERE id=?`).get(reportId) as StoredReport | undefined;
    return row ?? null;
  }
};
