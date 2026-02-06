import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/server";

describe("POST /analyze", () => {
  it("should validate input", async () => {
    const app = await createApp();
    const res = await request(app).post("/analyze").send({});
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});
