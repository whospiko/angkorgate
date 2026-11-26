"use server"

import { apiClient, ApiError } from "@/lib/api-client"
import type { Passkey, PasskeyAuthOptionsResponse } from "../types/passkey.types"
import type { AuthSuccessData } from "../types/auth.schemas"

/**
 * Request WebAuthn registration options for the currently authenticated user
 */
export async function getPasskeyRegistrationOptionsAction(
  userDisplayName?: string,
  targetUserId?: string
) {
  try {
    const options = await apiClient.post<any>("/auth/passkey/register/options", {
      userDisplayName,
      targetUserId,
    })
    return { success: true, options }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to generate passkey registration challenge."
    return { success: false, message }
  }
}

/**
 * Verify WebAuthn registration response and save passkey
 */
export async function verifyPasskeyRegistrationAction(
  response: any,
  friendlyName?: string,
  targetUserId?: string
) {
  try {
    const passkey = await apiClient.post<Passkey>("/auth/passkey/register/verify", {
      response,
      friendlyName,
      targetUserId,
    })
    return { success: true, passkey }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to verify passkey registration."
    return { success: false, message }
  }
}

/**
 * Get passkeys registered to the current user
 */
export async function getMyPasskeysAction(): Promise<{
  success: boolean
  passkeys?: Passkey[]
  message?: string
}> {
  try {
    const passkeys = await apiClient.get<Passkey[]>("/auth/passkey/list")
    return { success: true, passkeys: passkeys || [] }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to retrieve passkeys."
    return { success: false, message }
  }
}

/**
 * Rename a passkey
 */
export async function renamePasskeyAction(passkeyId: string, friendlyName: string) {
  try {
    const updated = await apiClient.patch<Passkey>(`/auth/passkey/${passkeyId}`, {
      friendlyName,
    })
    return { success: true, passkey: updated }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to rename passkey."
    return { success: false, message }
  }
}

/**
 * Delete a passkey
 */
export async function deletePasskeyAction(passkeyId: string) {
  try {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/auth/passkey/${passkeyId}`
    )
    return { success: true, message: res.message || "Passkey deleted." }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to delete passkey."
    return { success: false, message }
  }
}

/**
 * Request WebAuthn authentication options (public)
 */
export async function getPasskeyAuthOptionsAction(email?: string) {
  try {
    const options = await apiClient.post<PasskeyAuthOptionsResponse>(
      "/auth/passkey/authenticate/options",
      { email }
    )
    return { success: true, options }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to generate passkey authentication options."
    return { success: false, message }
  }
}

/**
 * Verify WebAuthn authentication assertion, set session cookies, and authorize console access
 */
export async function verifyPasskeyAuthAction(
  challengeId: string,
  response: any,
  redirectUrl = "/dashboard"
): Promise<{
  success: boolean
  message?: string
  redirectUrl?: string
}> {
  let authData: AuthSuccessData
  try {
    authData = await apiClient.post<AuthSuccessData>(
      "/auth/passkey/authenticate/verify",
      { challengeId, response }
    )
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.statusCode === 401
          ? "Passkey authentication failed. Please try again or use your password."
          : error.message
        : "An unexpected error occurred during passkey authentication."
    return { success: false, message }
  }

  if (!authData || !authData.accessToken) {
    return {
      success: false,
      message: "Authentication response did not contain an access token.",
    }
  }

  // Authorize dashboard access based on configured allowed roles (default: ADMIN)
  let branding: any = null
  try {
    branding = await apiClient.get<any>("/system/branding")
  } catch {
    // Fallback
  }

  const allowedRoles =
    branding?.allowedDashboardRoles && branding.allowedDashboardRoles.length > 0
      ? branding.allowedDashboardRoles
      : ["ADMIN"]

  const userRoles = authData.user?.roles || []
  const hasAccess = userRoles.some((r: string) =>
    allowedRoles.some((allowed: string) => allowed.toUpperCase() === r.toUpperCase())
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

    // Set cookies
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
        httpOnly: false,
        secure: isProd,
        sameSite: "lax",
        path: "/",
        maxAge: authData.refreshTokenExpiresIn || 7 * 24 * 60 * 60,
      })
    }
  } catch {
    // Non-request context (e.g. unit testing)
  }

  return { success: true, redirectUrl: targetPath }
}

/**
 * Admin: list passkeys for any user ID
 */
export async function getAdminUserPasskeysAction(userId: string): Promise<{
  success: boolean
  passkeys?: Passkey[]
  message?: string
}> {
  try {
    const passkeys = await apiClient.get<Passkey[]>(`/auth/passkey/admin/users/${userId}`)
    return { success: true, passkeys: passkeys || [] }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to retrieve user passkeys."
    return { success: false, message }
  }
}

/**
 * Admin: revoke passkey for any user ID
 */
export async function adminRevokeUserPasskeyAction(userId: string, passkeyId: string) {
  try {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/auth/passkey/admin/users/${userId}/${passkeyId}`
    )
    return { success: true, message: res.message || "Passkey revoked by admin." }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to revoke passkey."
    return { success: false, message }
  }
}
