import { NextResponse, type NextRequest } from "next/server"

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
]

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const token = request.cookies.get("angkorgate_token")?.value

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  // Verify token is structurally a valid 3-part JWT and not expired
  let isValidToken = false
  if (token) {
    const parts = token.split(".")
    if (parts.length === 3) {
      try {
        const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8")
        const payload = JSON.parse(payloadJson)
        const now = Math.floor(Date.now() / 1000)
        if (!payload.exp || payload.exp > now) {
          isValidToken = true
        }
      } catch {
        isValidToken = false
      }
    }
  }

  // Redirect unauthenticated requests targeting protected routes to /login with unauthorized signal
  if (isProtected && !isValidToken) {
    const loginUrl = new URL("/login", request.url)
    const redirectTarget = `${pathname}${search}`
    loginUrl.searchParams.set("redirect", redirectTarget)
    loginUrl.searchParams.set("unauthorized", "1")
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated requests away from /login to /dashboard
  if (pathname === "/login" && isValidToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Root route redirection based on session status
  if (pathname === "/") {
    if (isValidToken) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    } else {
      const loginUrl = new URL("/login", request.url)
      return NextResponse.redirect(loginUrl)
    }
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
