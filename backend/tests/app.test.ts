import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "../src/app";

describe("application routing", () => {
  it("serves API health without a database connection", async () => {
    const response = await request(app).get("/api/v1/health").expect(200);
    expect(response.body.data).toMatchObject({ status: "ok", service: "assetflow-api" });
  });

  it("protects organization routes", async () => {
    const response = await request(app).get("/api/v1/departments").expect(401);
    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("returns the shared error shape for unknown routes", async () => {
    const response = await request(app).get("/api/v1/not-real").expect(404);
    expect(response.body.error).toMatchObject({ code: "NOT_FOUND" });
  });
});
