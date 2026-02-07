import dotenv from "dotenv";
dotenv.config();

import path from "node:path";
import { fileURLToPath } from "node:url";

export type NodeEnv = "development" | "test" | "production";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// env.ts 在 backend/src/config/env.ts
const backendRoot = path.resolve(__dirname, "..", ".."); // -> backend/

function resolveFromBackendRoot(p: string) {
  return path.isAbsolute(p) ? p : path.resolve(backendRoot, p);
}

export const env = {
  nodeEnv: (process.env.NODE_ENV as NodeEnv) ?? "development",
  port: Number(process.env.PORT ?? "8787"),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000").split(",").map(s => s.trim()),

dbPath: resolveFromBackendRoot(
  process.env.DB_PATH ?? "data/backend.sqlite"
),


  defaultMode: (process.env.ANALYZE_MODE ?? "local") as "local" | "docker",
  defaultTools: (process.env.ANALYZE_TOOLS ?? "slither").split(",").map(s => s.trim()) as Array<
    "slither" | "mythril"
  >,

  // 如果你之前已经加过这个就保留
  toolPathExtra: (process.env.TOOL_PATH_EXTRA ?? `${process.env.HOME}/.local/bin`)
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
};
