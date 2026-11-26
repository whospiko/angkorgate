import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAuthorizationUrl,
  createPkceChallenge,
  decodeJwtPayload,
  isJwtUnexpired,
} from "./oidc-client";

describe("@angkorgate/react oidc-client", () => {
  it("generates S256 PKCE challenge and authorization URL", async () => {
    const challenge = await createPkceChallenge("test-verifier-123");
    assert.ok(challenge.length > 20);
    assert.ok(!challenge.includes("+") && !challenge.includes("/"));

    const { url, transaction } = await buildAuthorizationUrl({
      baseUrl: "http://localhost:8080/",
      clientId: "demo-app",
      redirectUri: "http://localhost:3001/callback",
      scope: "openid profile email",
      redirectTo: "/dashboard",
    });

    const parsed = new URL(url);
    assert.equal(parsed.origin, "http://localhost:8080");
    assert.equal(parsed.pathname, "/oidc/auth");
    assert.equal(parsed.searchParams.get("client_id"), "demo-app");
    assert.equal(parsed.searchParams.get("code_challenge_method"), "S256");
    assert.equal(parsed.searchParams.get("state"), transaction.state);
  });

  it("decodes JWT payload and checks expiration", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const pastExp = Math.floor(Date.now() / 1000) - 60;
    const makeJwt = (payload: object) =>
      `eyJhbGciOiJSUzI1NiJ9.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.sig`;

    const valid = makeJwt({ sub: "u1", exp: futureExp });
    const expired = makeJwt({ sub: "u1", exp: pastExp });

    assert.equal(decodeJwtPayload<{ sub: string }>(valid)?.sub, "u1");
    assert.equal(isJwtUnexpired(valid), true);
    assert.equal(isJwtUnexpired(expired), false);
    assert.equal(isJwtUnexpired("opaque-token"), false);
  });
});
