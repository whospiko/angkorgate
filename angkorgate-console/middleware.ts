import { NextResponse, type NextRequest } from "next/server"
import { getCoreApiUrl } from "@/lib/env"

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/apps",
  "/users",
  "/rbac",
  "/oauth-providers",
  "/audit",
  "/customers",
  "/employees",
  "/oidc",
  "/settings",
]

function isAccessTokenValid(token?: string): boolean {
  if (!token) return false
  const parts = token.split(".")
  if (parts.length !== 3) return false
  try {
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8")
    const payload = JSON.parse(payloadJson) as { exp?: number }
    const now = Math.floor(Date.now() / 1000)
    return !payload.exp || payload.exp > now
  } catch {
    return false
  }
}

interface RefreshedAuthData {
  accessToken: string
  refreshToken: string
  accessTokenExpiresIn?: number
  refreshTokenExpiresIn?: number
  user?: unknown
}

async function tryRefreshSession(
  request: NextRequest,
  refreshToken: string
): Promise<RefreshedAuthData | null> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    }
    const ua = request.headers.get("user-agent")
    if (ua) headers["User-Agent"] = ua
    const forwardedFor =
      request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip")
    if (forwardedFor) headers["X-Forwarded-For"] = forwardedFor

    const res = await fetch(`${getCoreApiUrl()}/auth/refresh`, {
      method: "POST",
      headers,
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    })
    if (!res.ok) return null

    const json = (await res.json()) as { data?: RefreshedAuthData } | RefreshedAuthData
    const data =
      json && typeof json === "object" && "data" in json && json.data
        ? json.data
        : (json as RefreshedAuthData)
    if (!data?.accessToken || !data?.refreshToken) return null
    return data
  } catch {
    return null
  }
}

function buildCookieHeaderWithUpdates(
  request: NextRequest,
  updates: Record<string, string>
): string {
  const map = new Map<string, string>()
  for (const c of request.cookies.getAll()) {
    map.set(c.name, c.value)
  }
  for (const [k, v] of Object.entries(updates)) {
    map.set(k, v)
  }
  return Array.from(map.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ")
}

function applyRefreshedCookies(
  response: NextResponse,
  data: RefreshedAuthData
) {
  const isProd = process.env.NODE_ENV === "production"
  response.cookies.set("angkorgate_token", data.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: data.accessTokenExpiresIn || 900,
  })
  response.cookies.set("angkorgate_refresh_token", data.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: data.refreshTokenExpiresIn || 7 * 24 * 60 * 60,
  })
  if (data.user) {
    response.cookies.set("angkorgate_user", JSON.stringify(data.user), {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: data.refreshTokenExpiresIn || 7 * 24 * 60 * 60,
    })
  }
}

function clearAuthCookies(response: NextResponse) {
  response.cookies.delete("angkorgate_token")
  response.cookies.delete("angkorgate_refresh_token")
  response.cookies.delete("angkorgate_user")
  response.cookies.delete("angkorgate_session")
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const token = request.cookies.get("angkorgate_token")?.value
  const refreshToken = request.cookies.get("angkorgate_refresh_token")?.value

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  let isValidToken = isAccessTokenValid(token)
  let refreshedData: RefreshedAuthData | null = null

  // If landing on /login with unauthorized query param, clear stale cookies
  if (pathname === "/login" && request.nextUrl.searchParams.has("unauthorized")) {
    const response = NextResponse.next()
    clearAuthCookies(response)
    return response
  }

  // Attempt transparent refresh if access token is missing/expired and refresh token exists
  if (!isValidToken && refreshToken && (isProtected || pathname === "/login" || pathname === "/")) {
    refreshedData = await tryRefreshSession(request, refreshToken)
    if (refreshedData) {
      isValidToken = true
    }
  }

  // Redirect unauthenticated requests targeting protected routes to /login with unauthorized signal
  if (isProtected && !isValidToken) {
    const loginUrl = new URL("/login", request.url)
    const redirectTarget = `${pathname}${search}`
    loginUrl.searchParams.set("redirect", redirectTarget)
    loginUrl.searchParams.set("unauthorized", "1")
    const response = NextResponse.redirect(loginUrl)
    clearAuthCookies(response)
    return response
  }

  // Redirect authenticated requests away from /login to /dashboard
  if (pathname === "/login" && isValidToken) {
    const response = NextResponse.redirect(new URL("/dashboard", request.url))
    if (refreshedData) applyRefreshedCookies(response, refreshedData)
    return response
  }

  // Root route redirection based on session status
  if (pathname === "/") {
    if (isValidToken) {
      const response = NextResponse.redirect(new URL("/dashboard", request.url))
      if (refreshedData) applyRefreshedCookies(response, refreshedData)
      return response
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (refreshedData) {
    const requestHeaders = new Headers(request.headers)
    const cookieUpdates: Record<string, string> = {
      angkorgate_token: refreshedData.accessToken,
      angkorgate_refresh_token: refreshedData.refreshToken,
    }
    if (refreshedData.user) {
      cookieUpdates.angkorgate_user = JSON.stringify(refreshedData.user)
    }
    requestHeaders.set(
      "cookie",
      buildCookieHeaderWithUpdates(request, cookieUpdates)
    )
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    })
    applyRefreshedCookies(response, refreshedData)
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static chunks and styles)
     * - _next/image (image optimization files)
     * - favicon.ico (browser icon)
     * - static file assets with common extensions (.svg, .png, .jpg, .css, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
