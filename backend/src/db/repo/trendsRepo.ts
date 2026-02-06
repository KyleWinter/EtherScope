import { getDb, nowIso } from "../client";
import { nanoid } from "nanoid";

export interface TrendRow {
  id: string;
  contract: string;
  metric: string;
  value: number;
  ts: string;
}

export const trendsRepo = {
  addPoint(contract: string, metric: string, value: number, ts = nowIso()) {
    const db = getDb();
    db.prepare(`INSERT INTO trends (id, contract, metric, value, ts) VALUES (?, ?, ?, ?, ?)`).run(
      nanoid(),
      contract,
      metric,
      value,
      ts
    );
  },

  query(contract: string, limit = 200): TrendRow[] {
    const db = getDb();
    return db
      .prepare(
        `SELECT id, contract, metric, value, ts
         FROM trends
         WHERE contract=?
         ORDER BY ts DESC
         LIMIT ?`
      )
      .all(contract, limit) as TrendRow[];
  }
};
