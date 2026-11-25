"use server"

import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { apiClient, ApiError } from "@/lib/api-client"
import { getBranding } from "@/features/system/server/system-actions"
import {
  LoginSchema,
  type AuthActionResult,
  type AuthSuccessData,
  type UserSummary,
} from "../types/auth.schemas"

export async function loginAction(
  _prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const rawEmail = formData.get("email")
  const rawPassword = formData.get("password")
  const rawRedirect = formData.get("redirect")

  const result = LoginSchema.safeParse({
    email: rawEmail,
    password: rawPassword,
  })

  if (!result.success) {
    const flattened = result.error.flatten()
    return {
      success: false,
      message: "Please fill in all required fields properly.",
      errors: {
        email: flattened.fieldErrors.email,
        password: flattened.fieldErrors.password,
      },
    }
  }

  let authData: AuthSuccessData
  try {
    authData = await apiClient.post<AuthSuccessData>("/auth/login", {
      email: result.data.email,
      password: result.data.password,
    })
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.statusCode === 401
          ? "Invalid email or password. Please verify your credentials."
          : error.message
        : "An unexpected error occurred while contacting the authentication service."

    return {
      success: false,
      message,
    }
  }

  if (!authData || !authData.accessToken) {
    return {
      success: false,
      message: "Authentication response did not contain an access token.",
    }
  }

  // Authorize dashboard access based on configured allowed roles (default: ADMIN)
  let branding = null
  try {
    branding = await getBranding()
  } catch {
    // Backend fallback
  }

  const allowedRoles =
    branding?.allowedDashboardRoles && branding.allowedDashboardRoles.length > 0
      ? branding.allowedDashboardRoles
      : ["ADMIN"]

  const userRoles = authData.user?.roles || []
  const hasAccess = userRoles.some((r) =>
    allowedRoles.some((allowed) => allowed.toUpperCase() === r.toUpperCase())
  )

  const cookieStore = await cookies()
  const isProd = process.env.NODE_ENV === "production"

  // Access Token cookie
  cookieStore.set("angkorgate_token", authData.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: authData.accessTokenExpiresIn || 900,
  })

  // Refresh Token cookie
  if (authData.refreshToken) {
    cookieStore.set("angkorgate_refresh_token", authData.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: authData.refreshTokenExpiresIn || 604800,
    })
  }

  // User Profile cookie
  cookieStore.set("angkorgate_user", JSON.stringify(authData.user), {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: authData.refreshTokenExpiresIn || 604800,
  })

  // Determine destination path:
  // Non-dashboard users (e.g. CUSTOMER) route to the self-service /account portal.
  // Dashboard authorized users default to /dashboard or their specified redirect.
  let defaultPath = hasAccess ? "/dashboard" : "/account"
  let targetPath = defaultPath

  if (
    typeof rawRedirect === "string" &&
    rawRedirect.startsWith("/") &&
    !rawRedirect.startsWith("//")
  ) {
    if (!hasAccess && !rawRedirect.startsWith("/account")) {
      targetPath = "/account"
    } else {
      targetPath = rawRedirect
    }
  }

  redirect(targetPath)
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get("angkorgate_refresh_token")?.value

  if (refreshToken) {
    try {
      await apiClient.post("/auth/logout", { refreshToken })
    } catch {
      // Backend logout failures should not block client logout
    }
  }

  cookieStore.delete("angkorgate_token")
  cookieStore.delete("angkorgate_refresh_token")
  cookieStore.delete("angkorgate_user")
  cookieStore.delete("angkorgate_session")

  redirect("/login")
}

export async function getCurrentUser(): Promise<UserSummary | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("angkorgate_token")?.value
  if (!token) return null

  // Authoritatively verify with backend /auth/me to guarantee account is active
  try {
    const user = await apiClient.get<UserSummary>("/auth/me", { token })
    if (user && user.id && user.email) {
      return user
    }
  } catch {
    return null
  }

  return null
}
