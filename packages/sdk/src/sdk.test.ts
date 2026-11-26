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

  it("verifies tokens via /oidc/me using custom fetchImpl", async () => {
    const mockFetch: typeof fetch = async (input) => {
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
    });
    const verified = await client.verifyToken("opaque-tok");
    assert.equal(verified?.id, "user-123");
    assert.equal(verified?.email, "piko@angkorgate.com");
    assert.deepEqual(verified?.roles, ["ADMIN"]);
    assert.deepEqual(verified?.permissions, ["users:read"]);
  });

  it("validates JWT expiration helper", () => {
    const valid = `h.${Buffer.from(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 600 })
    ).toString("base64url")}.s`;
    assert.equal(isJwtUnexpired(valid), true);
    assert.equal(isJwtUnexpired("not-a-jwt"), false);
  });
});
