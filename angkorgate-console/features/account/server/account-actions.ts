"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { apiClient, ApiError } from "@/lib/api-client"
import type {
  UserProfile,
  UpdateProfileInput,
  AccountSession,
  AccountActionResult,
} from "../types/account.types"

/**
 * Fetch authenticated user's self profile
 */
export async function getMyProfile(): Promise<UserProfile | null> {
  try {
    const profile = await apiClient.get<UserProfile>("/auth/me")
    return profile
  } catch (error) {
    console.error("Failed to fetch self profile:", error)
    return null
  }
}

/**
 * Update authenticated user's profile (name, phone)
 */
export async function updateMyProfile(
  input: UpdateProfileInput
): Promise<AccountActionResult<UserProfile>> {
  try {
    const updated = await apiClient.patch<UserProfile>("/auth/me", input)
    revalidatePath("/account")
    return {
      success: true,
      message: "Profile updated successfully.",
      data: updated,
    }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to update profile. Please try again."
    return { success: false, message }
  }
}

/**
 * Change current user's password
 */
export async function changeMyPasswordAction(
  oldPassword: string,
  newPassword: string
): Promise<AccountActionResult> {
  if (!oldPassword || !newPassword) {
    return {
      success: false,
      message: "Both current password and new password are required.",
    }
  }

  if (newPassword.length < 8) {
    return {
      success: false,
      message: "New password must be at least 8 characters long.",
    }
  }

  try {
    await apiClient.post("/auth/change-password", {
      oldPassword,
      newPassword,
    })
    return {
      success: true,
      message: "Password changed successfully. Your other active sessions have been invalidated.",
    }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to change password. Please check your current password."
    return { success: false, message }
  }
}

/**
 * List all active sessions for current user
 */
export async function getMySessionsAction(): Promise<AccountSession[]> {
  try {
    let currentRefreshToken: string | undefined
    try {
      const cookieStore = await cookies()
      currentRefreshToken = cookieStore.get("angkorgate_refresh_token")?.value
    } catch {
      // In non-cookie context
    }

    const queryStr = currentRefreshToken
      ? `?currentRefreshToken=${encodeURIComponent(currentRefreshToken)}`
      : ""

    const sessions = await apiClient.get<AccountSession[]>(`/auth/sessions${queryStr}`)
    return Array.isArray(sessions) ? sessions : []
  } catch (error) {
    console.error("Failed to fetch sessions:", error)
    return []
  }
}

/**
 * Revoke a specific active session
 */
export async function revokeSessionAction(
  sessionId: string
): Promise<AccountActionResult> {
  try {
    await apiClient.delete(`/auth/sessions/${sessionId}`)
    revalidatePath("/account")
    return {
      success: true,
      message: "Session terminated successfully.",
    }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to revoke session."
    return { success: false, message }
  }
}

/**
 * Revoke all other active sessions while preserving the current session
 */
export async function revokeOtherSessionsAction(): Promise<AccountActionResult<{ revokedCount: number }>> {
  try {
    let currentRefreshToken: string | undefined
    try {
      const cookieStore = await cookies()
      currentRefreshToken = cookieStore.get("angkorgate_refresh_token")?.value
    } catch {
      // In non-cookie context
    }

    if (!currentRefreshToken) {
      return {
        success: false,
        message: "Unable to identify your current session token. Please sign in again.",
      }
    }

    const result = await apiClient.post<{ revokedCount: number }>(
      "/auth/sessions/revoke-others",
      { currentRefreshToken }
    )
    revalidatePath("/account")
    const count = result?.revokedCount ?? 0
    return {
      success: true,
      message:
        count > 0
          ? `Revoked ${count} other active ${count === 1 ? "session" : "sessions"}.`
          : "No other active sessions to revoke.",
      data: result,
    }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to revoke other sessions."
    return { success: false, message }
  }
}

/**
 * Log out from all active devices and sessions
 */
export async function logoutAllSessionsAction(): Promise<AccountActionResult> {
  try {
    await apiClient.post("/auth/logout-all", {})
    revalidatePath("/account")
    return {
      success: true,
      message: "Successfully logged out from all sessions.",
    }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to log out of all sessions."
    return { success: false, message }
  }
}
