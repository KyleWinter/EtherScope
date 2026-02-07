CREATE TABLE IF NOT EXISTS tx_jobs (
  tx_hash TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
