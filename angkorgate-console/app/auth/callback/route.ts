import { NextResponse, type NextRequest } from "next/server"
import { apiClient } from "@/lib/api-client"
import { getConsoleUrl, getCoreApiUrl } from "@/lib/env"
import type { UserSummary } from "@/features/auth/types/auth.schemas"
import type { BrandingConfig } from "@/features/system/types/branding.types"

function isLocalHost(host: string): boolean {
  return host.startsWith("localhost") || host.startsWith("127.0.0.1")
}

function getPublicOrigin(request: NextRequest, fallbackWebUrl?: string): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
  if (forwardedHost && !isLocalHost(forwardedHost)) {
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https"
    return `${forwardedProto}://${forwardedHost}`
  }

  const host = request.headers.get("host")?.split(",")[0]?.trim()
  if (host && !isLocalHost(host)) {
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https"
    return `${forwardedProto}://${host}`
  }

  if (fallbackWebUrl && fallbackWebUrl.startsWith("http")) {
    return fallbackWebUrl
  }

  if (process.env.NEXT_PUBLIC_CONSOLE_URL || process.env.CONSOLE_URL) {
    return getConsoleUrl()
  }

  return request.url
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const ticket = searchParams.get("ticket")
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const oidcError = searchParams.get("error")
  const ssoCookie = request.cookies.get("angkorgate_sso_tx")?.value
  let targetRedirect = searchParams.get("redirect") || "/dashboard"
  const originBase = getPublicOrigin(request)

  // Handle OIDC silent SSO callback when angkorgate_sso_tx cookie is present
  if (!ticket && (code || oidcError) && ssoCookie) {
    let tx: {
      codeVerifier: string
      state: string
      redirectTo: string
      callbackUri: string
    } | null = null
    try {
      tx = JSON.parse(ssoCookie)
    } catch {
      tx = null
    }

    if (oidcError || !code || !tx || !state || state !== tx.state) {
      const loginUrl = new URL("/login", originBase)
      loginUrl.searchParams.set("unauthorized", "1")
      if (tx?.redirectTo) {
        loginUrl.searchParams.set("redirect", tx.redirectTo)
      }
      const res = NextResponse.redirect(loginUrl)
      res.cookies.delete("angkorgate_sso_tx")
      return res
    }

    targetRedirect = tx.redirectTo || "/account"

    try {
      const coreUrl = getCoreApiUrl()
      const tokenRes = await fetch(`${coreUrl}/oidc/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: "angkorgate-console",
          code,
          redirect_uri: tx.callbackUri,
          code_verifier: tx.codeVerifier,
        }).toString(),
        cache: "no-store",
      })

      if (!tokenRes.ok) {
        throw new Error(`OIDC token exchange failed (${tokenRes.status})`)
      }

      const tokenData = (await tokenRes.json()) as { access_token?: string }
      if (!tokenData.access_token) {
        throw new Error("Missing access_token from OIDC token endpoint")
      }

      const sessionRes = await fetch(`${coreUrl}/oidc/sso-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ accessToken: tokenData.access_token }),
        cache: "no-store",
      })

      if (!sessionRes.ok) {
        throw new Error(`SSO session exchange failed (${sessionRes.status})`)
      }

      const sessionData = (await sessionRes.json()) as {
        accessToken: string
        refreshToken?: string
        user?: UserSummary
      }

      const user: UserSummary =
        sessionData.user ||
        (await apiClient.get<UserSummary>("/auth/me", {
          token: sessionData.accessToken,
        }))

      const response = NextResponse.redirect(new URL(targetRedirect, originBase))
      const isProd = process.env.NODE_ENV === "production"

      response.cookies.delete("angkorgate_sso_tx")
      response.cookies.set("angkorgate_token", sessionData.accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 900,
      })

      if (sessionData.refreshToken) {
        response.cookies.set("angkorgate_refresh_token", sessionData.refreshToken, {
          httpOnly: true,
          secure: isProd,
          sameSite: "lax",
          path: "/",
          maxAge: 604800,
        })
      }

      response.cookies.set("angkorgate_user", JSON.stringify(user), {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 604800,
      })

      return response
    } catch (err) {
      console.error("OIDC SSO callback failed:", err)
      const loginUrl = new URL("/login", originBase)
      loginUrl.searchParams.set("unauthorized", "1")
      loginUrl.searchParams.set("redirect", targetRedirect)
      const res = NextResponse.redirect(loginUrl)
      res.cookies.delete("angkorgate_sso_tx")
      return res
    }
  }

  if (!ticket) {
    return NextResponse.redirect(new URL("/login?error=missing_ticket", originBase))
  }

  try {
    // 1. Redeem single-use ticket for auth tokens
    const ticketData = await apiClient.post<{
      accessToken: string
      refreshToken: string
      userId: string
      provider: string
      webUrl?: string
    }>("/auth/oauth/ticket", { ticket })

    const { accessToken, refreshToken, userId, webUrl } = ticketData
    const effectiveOrigin = getPublicOrigin(request, webUrl)

    if (!accessToken) {
      console.error("Ticket redemption did not return an access token:", ticketData)
      return NextResponse.redirect(new URL("/login?error=invalid_ticket", effectiveOrigin))
    }

    // 2. Fetch authenticated user profile
    let user: UserSummary
    try {
      user = await apiClient.get<UserSummary>("/auth/me", { token: accessToken })
    } catch (err) {
      console.error("Failed to fetch user profile with redeemed token:", err)
      user = {
        id: userId,
        email: null,
        phone: null,
        roles: [],
        mustChangePassword: false,
      }
    }

    // 3. Verify user has permission to access the admin dashboard
    let branding: BrandingConfig | null = null
    try {
      branding = await apiClient.get<BrandingConfig>("/system/branding")
    } catch {
      // Backend fallback
    }

    const allowedRoles =
      branding?.allowedDashboardRoles && branding.allowedDashboardRoles.length > 0
        ? branding.allowedDashboardRoles
        : ["ADMIN"]

    const userRoles = user.roles || []
    const hasAccess = userRoles.some((r) =>
      allowedRoles.some((allowed: string) => allowed.toUpperCase() === r.toUpperCase())
    )

    // 4. Route dashboard-authorized users to destination (default /dashboard);
    //    route non-dashboard users (e.g. CUSTOMER) to self-service /account portal.
    const destination = hasAccess
      ? targetRedirect.startsWith("/") && !targetRedirect.startsWith("//")
        ? targetRedirect
        : "/dashboard"
      : targetRedirect.startsWith("/account")
      ? targetRedirect
      : "/account"

    const response = NextResponse.redirect(new URL(destination, effectiveOrigin))
    const isProd = process.env.NODE_ENV === "production"

    response.cookies.set("angkorgate_token", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 900,
    })

    if (refreshToken) {
      response.cookies.set("angkorgate_refresh_token", refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 604800,
      })
    }

    response.cookies.set("angkorgate_user", JSON.stringify(user), {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 604800,
    })

    return response
  } catch (err) {
    console.error("OAuth ticket redemption failed:", err)
    return NextResponse.redirect(new URL("/login?error=oauth_failed", originBase))
  }
}
