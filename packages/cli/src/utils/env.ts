import dotenv from "dotenv";

export function loadEnv() {
  // 优先读取当前工作目录的 .env
  dotenv.config();
}
