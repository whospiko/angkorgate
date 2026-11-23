import { NextResponse, type NextRequest } from "next/server"
import { apiClient } from "@/lib/api-client"
import type { UserSummary } from "@/features/auth/types/auth.schemas"
import type { BrandingConfig } from "@/features/system/types/system.types"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const ticket = searchParams.get("ticket")
  const targetRedirect = searchParams.get("redirect") || "/dashboard"

  if (!ticket) {
    return NextResponse.redirect(new URL("/login?error=missing_ticket", request.url))
  }

  try {
    // 1. Redeem single-use ticket for auth tokens
    const ticketData = await apiClient.post<{
      accessToken: string
      refreshToken: string
      userId: string
      provider: string
    }>("/auth/oauth/ticket", { ticket })

    const { accessToken, refreshToken, userId } = ticketData

    if (!accessToken) {
      console.error("Ticket redemption did not return an access token:", ticketData)
      return NextResponse.redirect(new URL("/login?error=invalid_ticket", request.url))
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
      allowedRoles.some((allowed) => allowed.toUpperCase() === r.toUpperCase())
    )

    if (!hasAccess) {
      console.warn(
        `User ${user.email || userId} (${userRoles.join(", ")}) is not authorized for dashboard.`
      )
      return NextResponse.redirect(new URL("/login?unauthorized=1", request.url))
    }

    // 4. Set session cookies directly on the redirect response
    const destination =
      targetRedirect.startsWith("/") && !targetRedirect.startsWith("//")
        ? targetRedirect
        : "/dashboard"

    const response = NextResponse.redirect(new URL(destination, request.url))
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
    return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url))
  }
}
