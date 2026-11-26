import "server-only"

import { apiClient } from "@/lib/api-client"
import type { AuthSuccessData } from "../types/auth.schemas"

/**
 * Resolves the safe post-login redirect path and persists HttpOnly session cookies.
 */
export async function establishAuthSession(
  authData: AuthSuccessData,
  redirectUrl = "/dashboard"
): Promise<string> {
  let branding: { allowedDashboardRoles?: string[] } | null = null
  try {
    branding = await apiClient.get<{ allowedDashboardRoles?: string[] }>(
      "/system/branding"
    )
  } catch {
    // Fallback to default ADMIN role if branding lookup fails
  }

  const allowedRoles =
    branding?.allowedDashboardRoles && branding.allowedDashboardRoles.length > 0
      ? branding.allowedDashboardRoles
      : ["ADMIN"]

  const userRoles = authData.user?.roles || []
  const hasAccess = userRoles.some((r) =>
    allowedRoles.some((allowed) => allowed.toUpperCase() === r.toUpperCase())
  )

  const defaultPath = hasAccess ? "/dashboard" : "/account"
  let targetPath = defaultPath

  if (
    typeof redirectUrl === "string" &&
    redirectUrl.startsWith("/") &&
    !redirectUrl.startsWith("//")
  ) {
    if (!hasAccess && !redirectUrl.startsWith("/account")) {
      targetPath = "/account"
    } else {
      targetPath = redirectUrl
    }
  }

  try {
    const { cookies } = await import("next/headers")
    const cookieStore = await cookies()
    const isProd = process.env.NODE_ENV === "production"

    cookieStore.set("angkorgate_token", authData.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: authData.accessTokenExpiresIn || 900,
    })

    if (authData.refreshToken) {
      cookieStore.set("angkorgate_refresh_token", authData.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: authData.refreshTokenExpiresIn || 7 * 24 * 60 * 60,
      })
    }

    if (authData.user) {
      cookieStore.set("angkorgate_user", JSON.stringify(authData.user), {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: authData.refreshTokenExpiresIn || 7 * 24 * 60 * 60,
      })
    }
  } catch {
    // Non-request context (e.g. unit testing)
  }

  return targetPath
}
