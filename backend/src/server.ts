import express from "express";
import http from "node:http";

import { env } from "./config/env";
import { corsMiddleware } from "./config/cors";

import { registerHealthRoutes } from "./routes/health";
import { registerAnalyzeRoutes } from "./routes/analyze";
import { registerTxRoutes } from "./routes/tx";
import { registerTrendsRoutes } from "./routes/trends";
import { registerMonitorRoutes } from "./routes/monitor";

import { createWsServer } from "./ws/wsServer";
import { setWsBus } from "./serverBus";

import { registerAnalyzeJobHandler } from "./jobs/analyzeJob";
import { registerMonitorJobHandler } from "./jobs/monitorJob";
import { startScheduler } from "./jobs/scheduler";

export async function createApp() {
  const app = express();

  app.use(express.json({ limit: "2mb" }));
  app.use(corsMiddleware());

  const router = express.Router();
  registerHealthRoutes(router);
  registerAnalyzeRoutes(router);
  registerTxRoutes(router);
  registerTrendsRoutes(router);
  registerMonitorRoutes(router);

  app.use(router);

  return app;
}

async function main() {
  const app = await createApp();
  const server = http.createServer(app);

  // WS
  const ws = createWsServer(server);
  setWsBus(ws);

  // jobs
  registerAnalyzeJobHandler();
  registerMonitorJobHandler();
  startScheduler();

  server.listen(env.port, () => {
    console.log(`[backend] listening on http://localhost:${env.port}`);
    console.log(`[backend] ws on ws://localhost:${env.port}`);
  });
}

main().catch((e) => {
  console.error("[backend] fatal:", e);
  process.exit(1);
});
