// backend/src/db/client.ts
import Database from "better-sqlite3";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { env } from "../config/env";

let db: Database.Database | null = null;

function resolveDbPath(): string {
  // 1) 优先用 env.dbPath（你已有）
  const configured = (env.dbPath ?? "").trim();
  if (configured) return path.resolve(configured);

  // 2) 默认固定到 repoRoot/backend/backend.sqlite（与你现在真实在用的一致）
  return path.resolve(process.cwd(), "backend", "backend.sqlite");
}

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = resolveDbPath();

    // 确保父目录存在（避免未来你把 dbPath 改到 backend/data/data.db 时炸）
    mkdirSync(path.dirname(dbPath), { recursive: true });

    // 打一行日志：以后永远知道自己连的是哪个 DB
    console.log(`[backend][db] using sqlite at: ${dbPath}`);

    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    migrate(db);
  }
  return db;
}

function migrate(conn: Database.Database) {
  // dev: 在 monorepo root 启动时
  const schemaPath = path.resolve(process.cwd(), "backend", "src", "db", "schema.sql");

  // production build: 在 backend/ 目录启动时（或 dist/）
  const altSchemaPath = path.resolve(process.cwd(), "src", "db", "schema.sql");

  // 兜底：有些人会在 backend/ 目录启动（cwd=backend）
  const alt2SchemaPath = path.resolve(process.cwd(), "backend", "src", "db", "schema.sql");

  const p =
    (existsSync(schemaPath) && schemaPath) ||
    (existsSync(altSchemaPath) && altSchemaPath) ||
    (existsSync(alt2SchemaPath) && alt2SchemaPath);

  if (!p) {
    throw new Error(
      `schema.sql not found. Tried:
- ${schemaPath}
- ${altSchemaPath}
- ${alt2SchemaPath}`
    );
  }

  const sql = readFileSync(p, "utf8");
  conn.exec(sql);
}

export function nowIso(): string {
  return new Date().toISOString();
}
