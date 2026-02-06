import cors from "cors";
import type { RequestHandler } from "express";
import { env } from "./env";

export function corsMiddleware(): RequestHandler {
  return cors({
    origin: (origin, cb) => {
      // allow non-browser tools like curl/postman
      if (!origin) return cb(null, true);
      if (env.corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true
  });
}
