import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/server";

describe("GET /trends", () => {
  it("should require contract param", async () => {
    const app = await createApp();
    const res = await request(app).get("/trends");
    expect(res.status).toBe(400);
  });
});
