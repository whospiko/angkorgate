import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NextFunction, Response } from "express";
import {
  angkorgateAuth,
  requirePermission,
  requireRole,
  requireRoleOrPermission,
  type AngkorGateRequest,
} from "./index";

function createMockRes() {
  const state: { statusCode: number; body: unknown } = {
    statusCode: 200,
    body: undefined,
  };
  const res = {
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      state.body = payload;
      return this;
    },
  } as unknown as Response;
  return { res, state };
}

describe("@angkorgate/express middleware", () => {
  const mockFetch: typeof fetch = async (_input, init) => {
    const auth = (init?.headers as Record<string, string>)?.Authorization;
    if (auth === "Bearer valid-admin") {
      return new Response(
        JSON.stringify({
          sub: "u-admin",
          email: "admin@angkorgate.local",
          roles: ["ADMIN"],
          permissions: ["todos:read:all"],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  };

  it("rejects missing Bearer token with 401 unless optional is true", async () => {
    const authMw = angkorgateAuth({
      baseUrl: "http://localhost:8080",
      fetchImpl: mockFetch,
    });
    const req = { headers: {} } as AngkorGateRequest;
    const { res, state } = createMockRes();
    let nextCalled = false;

    await authMw(req, res, (() => {
      nextCalled = true;
    }) as NextFunction);

    assert.equal(nextCalled, false);
    assert.equal(state.statusCode, 401);

    const optMw = angkorgateAuth({
      baseUrl: "http://localhost:8080",
      fetchImpl: mockFetch,
      optional: true,
    });
    await optMw(req, res, (() => {
      nextCalled = true;
    }) as NextFunction);
    assert.equal(nextCalled, true);
    assert.equal(req.authUser, undefined);
  });

  it("attaches req.authUser for valid Bearer token and enforces RBAC", async () => {
    const authMw = angkorgateAuth({
      baseUrl: "http://localhost:8080",
      fetchImpl: mockFetch,
    });
    const req = {
      headers: { authorization: "Bearer valid-admin" },
    } as AngkorGateRequest;
    const { res, state } = createMockRes();
    let nextCalled = false;

    await authMw(req, res, (() => {
      nextCalled = true;
    }) as NextFunction);

    assert.equal(nextCalled, true);
    assert.equal(req.authUser?.id, "u-admin");

    // requireRole pass & fail
    let roleNext = false;
    requireRole("ADMIN")(req, res, (() => {
      roleNext = true;
    }) as NextFunction);
    assert.equal(roleNext, true);

    let deniedNext = false;
    requireRole("SUPERUSER")(req, res, (() => {
      deniedNext = true;
    }) as NextFunction);
    assert.equal(deniedNext, false);
    assert.equal(state.statusCode, 403);

    // requirePermission pass
    let permNext = false;
    requirePermission("todos:read:all")(req, res, (() => {
      permNext = true;
    }) as NextFunction);
    assert.equal(permNext, true);

    // requireRoleOrPermission pass
    let orNext = false;
    requireRoleOrPermission({
      roles: ["MANAGER"],
      permissions: ["todos:read:all"],
    })(req, res, (() => {
      orNext = true;
    }) as NextFunction);
    assert.equal(orNext, true);
  });
});
