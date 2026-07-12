import type { Role } from "@prisma/client";
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { errorHandler } from "../src/middleware/error-handler";
import { requireRole } from "../src/middleware/rbac";
import { signAccessToken, verifyAccessToken } from "../src/middleware/auth";
import { signupSchema } from "../src/modules/auth/auth.schema";

const principal = {
  userId: "11111111-1111-4111-8111-111111111111",
  employeeId: "22222222-2222-4222-8222-222222222222",
  email: "person@example.com",
  role: "EMPLOYEE" as Role,
};

describe("JWT helpers", () => {
  it("signs and verifies the expected identity claims", () => {
    const claims = verifyAccessToken(signAccessToken(principal));

    expect(claims).toMatchObject({
      sub: principal.userId,
      employeeId: principal.employeeId,
      email: principal.email,
      role: "EMPLOYEE",
    });
  });

  it("rejects a tampered token", () => {
    const token = signAccessToken(principal);
    expect(() => verifyAccessToken(`${token.slice(0, -1)}x`)).toThrow("invalid or expired");
  });
});

describe("signup validation", () => {
  it("rejects role-shaped input to prevent self elevation", () => {
    const result = signupSchema.safeParse({
      name: "Mallory Example",
      email: "mallory@example.com",
      password: "password123",
      role: "ADMIN",
    });

    expect(result.success).toBe(false);
  });

  it("normalizes email and exposes no role field", () => {
    const result = signupSchema.parse({
      name: "New Employee",
      email: "NEW.EMPLOYEE@Example.com",
      password: "password123",
    });

    expect(result).toEqual({
      name: "New Employee",
      email: "new.employee@example.com",
      password: "password123",
    });
  });
});

describe("requireRole", () => {
  function roleApp(role?: Role) {
    const app = express();
    app.get(
      "/admin",
      (req, _res, next) => {
        if (role) req.auth = { ...principal, role };
        next();
      },
      requireRole("ADMIN"),
      (_req, res) => res.json({ data: "allowed" }),
    );
    app.use(errorHandler);
    return app;
  }

  it("allows an administrator", async () => {
    await request(roleApp("ADMIN")).get("/admin").expect(200, { data: "allowed" });
  });

  it("denies a non-admin", async () => {
    const response = await request(roleApp("EMPLOYEE")).get("/admin").expect(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("requires an authenticated principal", async () => {
    const response = await request(roleApp()).get("/admin").expect(401);
    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });
});
