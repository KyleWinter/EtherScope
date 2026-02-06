import Database from "better-sqlite3";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { env } from "../config/env";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(env.dbPath);
    db.pragma("journal_mode = WAL");
    migrate(db);
  }
  return db;
}

function migrate(conn: Database.Database) {
  // simplest: always ensure schema exists
  const schemaPath = path.resolve(process.cwd(), "backend/src/db/schema.sql");
  // when built, process.cwd might differ; fallback to dist path
  const altSchemaPath = path.resolve(process.cwd(), "src/db/schema.sql");

  const p = existsSync(schemaPath) ? schemaPath : altSchemaPath;
  const sql = readFileSync(p, "utf8");
  conn.exec(sql);
}

export function nowIso(): string {
  return new Date().toISOString();
}
