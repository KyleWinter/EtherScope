import dotenv from "dotenv";
dotenv.config();

export type NodeEnv = "development" | "test" | "production";

function mustGet(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const env = {
  nodeEnv: (process.env.NODE_ENV as NodeEnv) ?? "development",
  port: Number(process.env.PORT ?? "8787"),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000").split(",").map(s => s.trim()),
  dbPath: process.env.DB_PATH ?? "./backend.sqlite",
  // default analysis behavior
  defaultMode: (process.env.ANALYZE_MODE ?? "local") as "local" | "docker",
  defaultTools: (process.env.ANALYZE_TOOLS ?? "slither").split(",").map(s => s.trim()) as Array<
    "slither" | "mythril"
  >
};
