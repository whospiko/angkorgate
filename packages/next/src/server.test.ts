import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import { angkorgateMiddleware, createRouteMatcher } from "./server";

describe("@angkorgate/nextjs server", () => {
  it("matches protected routes with createRouteMatcher", () => {
    const isProtected = createRouteMatcher(["/dashboard", "/billing"]);
    assert.equal(
      isProtected(new NextRequest("http://localhost:3001/dashboard")),
      true
    );
    assert.equal(
      isProtected(new NextRequest("http://localhost:3001/dashboard/settings")),
      true
    );
    assert.equal(
      isProtected(new NextRequest("http://localhost:3001/pricing")),
      false
    );
  });

  it("redirects unauthenticated requests on /dashboard to /login", async () => {
    const mw = angkorgateMiddleware({ protectedRoutes: ["/dashboard"] });
    const res = await mw(new NextRequest("http://localhost:3001/dashboard"));
    assert.equal(res.status, 307);
    assert.equal(
      res.headers.get("location"),
      "http://localhost:3001/login?redirect=%2Fdashboard"
    );
  });

  it("allows requests with valid opaque token + unexpired id_token cookie", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const idJwt = `eyJhbGciOiJSUzI1NiJ9.${Buffer.from(
      JSON.stringify({ sub: "u1", exp: futureExp })
    ).toString("base64url")}.sig`;

    const mw = angkorgateMiddleware({ protectedRoutes: ["/dashboard"] });
    const req = new NextRequest("http://localhost:3001/dashboard", {
      headers: {
        cookie: `angkorgate_token=opaque_tok; angkorgate_id_token=${idJwt}`,
      },
    });
    const res = await mw(req);
    assert.equal(res.status, 200);
  });

  it("refreshes expired access token using refresh_token cookie when baseUrl and clientId are configured", async () => {
    const expiredExp = Math.floor(Date.now() / 1000) - 60;
    const expiredJwt = `eyJhbGciOiJSUzI1NiJ9.${Buffer.from(
      JSON.stringify({ sub: "u1", exp: expiredExp })
    ).toString("base64url")}.sig`;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          access_token: "fresh-access-tok",
          refresh_token: "rotated-refresh-tok",
          expires_in: 3600,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )) as typeof fetch;

    try {
      const mw = angkorgateMiddleware({
        protectedRoutes: ["/dashboard"],
        baseUrl: "http://localhost:8080",
        clientId: "demo-app",
      });
      const req = new NextRequest("http://localhost:3001/dashboard", {
        headers: {
          cookie: `angkorgate_token=${expiredJwt}; angkorgate_refresh_token=old-rt`,
        },
      });
      const res = await mw(req);
      assert.equal(res.status, 200);
      const setCookies = res.headers.getSetCookie();
      assert.ok(setCookies.some((c) => c.includes("angkorgate_token=fresh-access-tok")));
      assert.ok(setCookies.some((c) => c.includes("angkorgate_refresh_token=rotated-refresh-tok")));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
