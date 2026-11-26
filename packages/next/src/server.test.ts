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

  it("redirects unauthenticated requests on /dashboard to /login", () => {
    const mw = angkorgateMiddleware({ protectedRoutes: ["/dashboard"] });
    const res = mw(new NextRequest("http://localhost:3001/dashboard"));
    assert.equal(res.status, 307);
    assert.equal(
      res.headers.get("location"),
      "http://localhost:3001/login?redirect=%2Fdashboard"
    );
  });

  it("allows requests with valid opaque token + unexpired id_token cookie", () => {
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
    const res = mw(req);
    assert.equal(res.status, 200);
  });
});
