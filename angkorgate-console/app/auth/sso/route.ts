import crypto from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { getConsoleUrl } from "@/lib/env"

function toBase64Url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export async function GET(request: NextRequest) {
  const redirectParam = request.nextUrl.searchParams.get("redirect") || "/account"
  const safeRedirect =
    redirectParam.startsWith("/") && !redirectParam.startsWith("//")
      ? redirectParam
      : "/account"

  const coreUrl = (
    process.env.NEXT_PUBLIC_CORE_API_URL ||
    process.env.CORE_API_URL ||
    "http://localhost:8080"
  ).replace(/\/+$/, "")

  const consoleOrigin = (() => {
    const host = request.headers.get("host")
    if (host) {
      const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http"
      return `${proto}://${host}`
    }
    return getConsoleUrl()
  })().replace(/\/+$/, "")

  const codeVerifier = toBase64Url(crypto.randomBytes(32))
  const codeChallenge = toBase64Url(crypto.createHash("sha256").update(codeVerifier).digest())
  const state = toBase64Url(crypto.randomBytes(24))
  const callbackUri = `${consoleOrigin}/auth/callback`

  const params = new URLSearchParams({
    response_type: "code",
    client_id: "angkorgate-console",
    redirect_uri: callbackUri,
    scope: "openid profile email roles",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "none",
  })

  const response = NextResponse.redirect(`${coreUrl}/oidc/auth?${params.toString()}`)
  response.cookies.set(
    "angkorgate_sso_tx",
    JSON.stringify({ codeVerifier, state, redirectTo: safeRedirect, callbackUri }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 300,
    }
  )

  return response
}
