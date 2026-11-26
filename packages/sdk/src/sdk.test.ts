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
});
