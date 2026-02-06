-- Core tables

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL,           -- queued | running | succeeded | failed
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  input_json TEXT NOT NULL,
  result_json TEXT,               -- reportId or lightweight result
  error_text TEXT
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  tx_hash TEXT,
  created_at TEXT NOT NULL,
  tools_json TEXT NOT NULL,       -- {"slither": {...}, "mythril": {...}}
  findings_json TEXT NOT NULL     -- Finding[]
);

CREATE TABLE IF NOT EXISTS tx_reports (
  tx_hash TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trends (
  id TEXT PRIMARY KEY,
  contract TEXT NOT NULL,
  metric TEXT NOT NULL,           -- e.g., "high_count"
  value REAL NOT NULL,
  ts TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS monitors (
  id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  enabled INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trends_contract_ts ON trends(contract, ts);
CREATE INDEX IF NOT EXISTS idx_reports_txhash ON reports(tx_hash);
