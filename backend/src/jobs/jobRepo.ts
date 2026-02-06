import { getDb, nowIso } from "../db/client";
import type { Job } from "./queue";

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
  }
};
