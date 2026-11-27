import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AngkorGateClient,
  buildAuthorizationUrl,
  buildEndSessionUrl,
  createPkceChallenge,
  hasAnyPermission,
  hasAnyRole,
  hasPermission,
  hasRole,
  isJwtUnexpired,
} from "./index";

describe("@angkorgate/sdk", () => {
  it("builds PKCE authorization and end-session URLs", async () => {
    const challenge = await createPkceChallenge("verifier-abc");
    assert.ok(challenge.length > 20);

    const { url, transaction } = await buildAuthorizationUrl({
      baseUrl: "http://localhost:8080/",
      clientId: "demo-app",
      redirectUri: "http://localhost:3001/callback",
      prompt: "none",
    });

    const parsed = new URL(url);
    assert.equal(parsed.pathname, "/oidc/auth");
    assert.equal(parsed.searchParams.get("prompt"), "none");
    assert.equal(parsed.searchParams.get("state"), transaction.state);

    const logoutUrl = buildEndSessionUrl({
      baseUrl: "http://localhost:8080",
      postLogoutRedirectUri: "http://localhost:3001",
      idTokenHint: "id-tok",
    });
    assert.equal(
      logoutUrl,
      "http://localhost:8080/oidc/session/end?post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A3001&id_token_hint=id-tok"
    );
  });

  it("evaluates RBAC roles and permissions", () => {
    const user = {
      roles: ["ADMIN"],
      permissions: ["billing:read", "todos:write"],
    };
    assert.equal(hasRole(user, "admin"), true);
    assert.equal(hasAnyRole(user, ["CUSTOMER", "ADMIN"]), true);
    assert.equal(hasPermission(user, "billing:read"), true);
    assert.equal(hasPermission(user, "billing:delete"), false);
    assert.equal(hasAnyPermission(user, ["todos:write"]), true);
  });

  it("caches verified tokens by SHA-256 hash within TTL and clears on demand", async () => {
    let calls = 0;
    const mockFetch: typeof fetch = async (input) => {
      calls++;
      const url = String(input);
      if (url.endsWith("/oidc/me")) {
        return new Response(
          JSON.stringify({
            sub: "user-123",
            email: "piko@angkorgate.com",
            name: "Piko",
            roles: ["ADMIN"],
            permissions: ["users:read"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Not Found", { status: 404 });
    };

    const client = new AngkorGateClient({
      baseUrl: "http://localhost:8080",
      fetchImpl: mockFetch,
      tokenCacheTtlMs: 30_000,
    });

    const first = await client.verifyToken("opaque-tok");
    const second = await client.verifyToken("opaque-tok");
    assert.equal(first?.id, "user-123");
    assert.equal(second?.id, "user-123");
    assert.equal(calls, 1);

    client.clearTokenCache();
    await client.verifyToken("opaque-tok");
    assert.equal(calls, 2);
  });

  it("verifies RS256 JWTs locally against /oidc/jwks without calling /oidc/me", async () => {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"]
    );

    const publicJwk = (await crypto.subtle.exportKey(
      "jwk",
      keyPair.publicKey
    )) as JsonWebKey & { kid?: string; alg?: string; use?: string };
    publicJwk.kid = "key-1";
    publicJwk.alg = "RS256";
    publicJwk.use = "sig";

    const header = Buffer.from(
      JSON.stringify({ alg: "RS256", typ: "JWT", kid: "key-1" })
    ).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        sub: "jwt-user-1",
        email: "jwt@angkorgate.com",
        roles: ["ADMIN"],
        permissions: ["todos:read:all"],
        exp: Math.floor(Date.now() / 1000) + 600,
      })
    ).toString("base64url");

    const sigBuf = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      keyPair.privateKey,
      new TextEncoder().encode(`${header}.${payload}`)
    );
    const sig = Buffer.from(sigBuf).toString("base64url");
    const validJwt = `${header}.${payload}.${sig}`;
    const tamperedJwt = `${header}.${payload}.invalidSignature`;

    let meCalls = 0;
    let jwksCalls = 0;
    const mockFetch: typeof fetch = async (input) => {
      const url = String(input);
      if (url.endsWith("/oidc/jwks")) {
        jwksCalls++;
        return new Response(JSON.stringify({ keys: [publicJwk] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith("/oidc/me")) {
        meCalls++;
      }
      return new Response("Not Found", { status: 404 });
    };

    const client = new AngkorGateClient({
      baseUrl: "http://localhost:8080",
      fetchImpl: mockFetch,
      useJwks: true,
    });

    const verified = await client.verifyToken(validJwt);
    assert.equal(verified?.id, "jwt-user-1");
    assert.equal(verified?.email, "jwt@angkorgate.com");
    assert.deepEqual(verified?.roles, ["ADMIN"]);
    assert.equal(jwksCalls, 1);
    assert.equal(meCalls, 0);

    // Tampered signature must be rejected locally without falling back to /oidc/me
    const rejected = await client.verifyToken(tamperedJwt);
    assert.equal(rejected, null);
    assert.equal(meCalls, 0);
  });

  it("validates JWT expiration helper", () => {
    const valid = `h.${Buffer.from(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })
    ).toString("base64url")}.s`;
    assert.equal(isJwtUnexpired(valid), true);
    assert.equal(isJwtUnexpired("not-a-jwt"), false);
  });

  it("refreshes tokens and manages enriched active sessions", async () => {
    const calls: Array<{ url: string; method: string; body?: string }> = [];
    const mockFetch: typeof fetch = async (input, init) => {
      const url = String(input);
      const method = init?.method || "GET";
      calls.push({ url, method, body: init?.body ? String(init.body) : undefined });

      if (url.endsWith("/auth/refresh") && method === "POST") {
        return new Response(
          JSON.stringify({
            data: {
              accessToken: "new-at",
              refreshToken: "new-rt",
              accessTokenExpiresIn: 900,
              refreshTokenExpiresIn: 604800,
              user: {
                id: "u1",
                email: "piko@angkorgate.com",
                phone: null,
                roles: ["ADMIN"],
                mustChangePassword: false,
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/auth/sessions?") && method === "GET") {
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "s1",
                familyId: "fam-1",
                browser: "Chrome 131",
                os: "macOS 10.15",
                deviceType: "desktop",
                ipAddress: "203.0.113.10",
                lastActiveAt: "2026-11-26T12:00:00.000Z",
                createdAt: "2026-11-26T11:00:00.000Z",
                expiresAt: "2026-12-03T11:00:00.000Z",
                isCurrent: true,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.endsWith("/auth/sessions/revoke-others") && method === "POST") {
        return new Response(
          JSON.stringify({ data: { revokedCount: 2 } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.endsWith("/auth/sessions/s2") && method === "DELETE") {
        return new Response(null, { status: 204 });
      }

      return new Response("Not Found", { status: 404 });
    };

    const client = new AngkorGateClient({
      baseUrl: "http://localhost:8080",
      fetchImpl: mockFetch,
    });

    const refreshed = await client.refresh("old-rt");
    assert.equal(refreshed.refreshToken, "new-rt");

    const sessions = await client.listSessions("new-at", "new-rt");
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].browser, "Chrome 131");
    assert.equal(sessions[0].os, "macOS 10.15");
    assert.equal(sessions[0].isCurrent, true);

    const revoked = await client.revokeOtherSessions("new-at", "new-rt");
    assert.equal(revoked.revokedCount, 2);

    await client.revokeSession("new-at", "s2");
    assert.equal(calls.length, 4);
  });

  it("queries ERP customers, HR employees, and availability with field projection", async () => {
    const requestedUrls: string[] = [];
    const mockFetch: typeof fetch = async (input) => {
      const url = String(input);
      requestedUrls.push(url);

      if (url.includes("/customers?")) {
        return new Response(
          JSON.stringify({
            data: {
              data: [
                {
                  id: "c1",
                  customerCode: "PAT-0001",
                  type: "PATIENT",
                  fullName: "Sok Dara",
                  dateOfBirth: "1995-01-01",
                  status: "ACTIVE",
                },
              ],
              total: 1,
              page: 1,
              limit: 10,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("/schedules/availability")) {
        return new Response(
          JSON.stringify({ data: { available: false, reason: "Public Holiday" } }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response("Not Found", { status: 404 });
    };

    const client = new AngkorGateClient({
      baseUrl: "http://localhost:8080",
      fetchImpl: mockFetch,
    });

    const customers = await client.listCustomers("ag_test_123", {
      type: "PATIENT",
      fields: ["id", "customerCode", "fullName"],
      limit: 10,
    });
    assert.equal(customers.total, 1);
    assert.equal(customers.data[0].customerCode, "PAT-0001");
    assert.ok(requestedUrls[0].includes("fields=id%2CcustomerCode%2CfullName"));

    const avail = await client.getEmployeeAvailability(
      "ag_test_123",
      "emp-1",
      "2026-12-25",
      "10:00"
    );
    assert.equal(avail.available, false);
    assert.equal(avail.reason, "Public Holiday");
  });
});
