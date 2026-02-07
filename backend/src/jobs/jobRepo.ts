// backend/src/jobs/jobRepo.ts
import { getDb, nowIso } from "../db/client";
import type { Job } from "./queue";

export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export interface JobRowLite {
  id: string;
  status: JobStatus;
  updatedAt: string;
  result?: unknown;
  error?: string;
}

export const jobRepo = {
  create(job: Job) {
    const db = getDb();
    db.prepare(
      `INSERT INTO jobs (id, type, status, created_at, updated_at, input_json)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(job.id, job.type, job.status, job.createdAt, job.updatedAt, JSON.stringify(job.input));
  },

  markRunning(id: string) {
    const db = getDb();
    db.prepare(`UPDATE jobs SET status=?, updated_at=? WHERE id=?`).run("running", nowIso(), id);
  },

  markSucceeded(id: string, result: unknown) {
    const db = getDb();
    db.prepare(`UPDATE jobs SET status=?, updated_at=?, result_json=? WHERE id=?`).run(
      "succeeded",
      nowIso(),
      JSON.stringify(result),
      id
    );
  },

  markFailed(id: string, error: string) {
    const db = getDb();
    db.prepare(`UPDATE jobs SET status=?, updated_at=?, error_text=? WHERE id=?`).run(
      "failed",
      nowIso(),
      error,
      id
    );
  },

  // ✅ NEW: find latest analyze job by txHash from input_json
  // Requires SQLite JSON1 extension (json_extract). Most SQLite builds used by better-sqlite3 include it.
  findLatestByTxHash(txHash: string): JobRowLite | null {
    const db = getDb();

    const row = db
      .prepare(
        `
        SELECT id, status, updated_at, result_json, error_text
        FROM jobs
        WHERE json_extract(input_json, '$.txHash') = ?
        ORDER BY updated_at DESC
        LIMIT 1
      `
      )
      .get(txHash) as
      | {
          id: string;
          status: JobStatus;
          updated_at: string;
          result_json: string | null;
          error_text: string | null;
        }
      | undefined;

    if (!row) return null;

    let result: unknown = undefined;
    if (row.result_json) {
      try {
        result = JSON.parse(row.result_json);
      } catch {
        result = undefined;
      }
    }

    return {
      id: row.id,
      status: row.status,
      updatedAt: row.updated_at,
      result,
      error: row.error_text ?? undefined
    };
  }
};
