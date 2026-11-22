"use server"

import "server-only"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { apiClient, ApiError } from "@/lib/api-client"
import type { SystemHealth, CacheStatus } from "../types/system.types"
import type {
  SetupStatus,
  BrandingConfig,
  SetupActionResult,
  BrandingActionResult,
} from "../types/branding.types"
import {
  InitialSetupSchema,
  UpdateBrandingSchema,
} from "../types/branding.schemas"

export async function getSystemHealth(): Promise<SystemHealth> {
  try {
    return await apiClient.get<SystemHealth>("/")
  } catch (error) {
    console.error("Failed to fetch system health:", error)
    return {
      status: "degraded",
      cache: {
        provider: "unknown",
        connected: false,
        enabled: false,
        prefix: "angkorgate:",
        itemCount: 0,
      },
    }
  }
}

export async function getCacheStatus(): Promise<CacheStatus> {
  try {
    return await apiClient.get<CacheStatus>("/cache/status")
  } catch (error) {
    console.error("Failed to fetch cache status:", error)
    return {
      provider: "in-memory",
      connected: false,
      enabled: false,
      prefix: "angkorgate:",
      itemCount: 0,
    }
  }
}

/**
 * Checks if the AngkorGate instance is initialized and configured.
 */
export async function getSetupStatus(): Promise<SetupStatus> {
  try {
    return await apiClient.get<SetupStatus>("/system/setup-status")
  } catch (error) {
    if ((error as { digest?: string })?.digest === "DYNAMIC_SERVER_USAGE") {
      throw error
    }
    console.error("Failed to fetch setup status:", error)
    return {
      isInitialized: true, // Default to true if API is unreachable to avoid accidental open wizard
      requiresAdmin: false,
      appName: "AngkorGate",
      logoUrl: null,
    }
  }
}

/**
 * Retrieves public application branding and content settings.
 */
export async function getBranding(): Promise<BrandingConfig> {
  try {
    return await apiClient.get<BrandingConfig>("/system/branding")
  } catch (error) {
    if ((error as { digest?: string })?.digest === "DYNAMIC_SERVER_USAGE") {
      throw error
    }
    console.error("Failed to fetch branding:", error)
    return {
      appName: "AngkorGate",
      appDescription: "Open-source Identity & Access Management (IAM)",
      logoUrl: null,
      faviconUrl: null,
      organizationName: "AngkorGate Team",
      supportEmail: null,
      footerText: "© 2026 AngkorGate Open Source",
    }
  }
}

/**
 * Executes first-time setup: creates super-admin, saves branding, and creates user session.
 */
export async function executeSetupAction(
  _prevState: SetupActionResult | null,
  formData: FormData
): Promise<SetupActionResult> {
  const rawData = {
    adminEmail: formData.get("adminEmail"),
    adminPassword: formData.get("adminPassword"),
    confirmPassword: formData.get("confirmPassword"),
    adminName: formData.get("adminName") || undefined,
    adminPhone: formData.get("adminPhone") || undefined,
    appName: formData.get("appName"),
    appDescription: formData.get("appDescription") || undefined,
    logoUrl: formData.get("logoUrl") || undefined,
    faviconUrl: formData.get("faviconUrl") || undefined,
    organizationName: formData.get("organizationName") || undefined,
    supportEmail: formData.get("supportEmail") || undefined,
    footerText: formData.get("footerText") || undefined,
  }

  const result = InitialSetupSchema.safeParse(rawData)
  if (!result.success) {
    const flattened = result.error.flatten()
    return {
      success: false,
      message: "Please correct the errors in the setup form.",
      errors: flattened.fieldErrors,
    }
  }

  interface SetupBackendResponse {
    success: boolean
    message: string
    user: {
      id: string
      email: string | null
      roles: string[]
    }
    tokens: {
      accessToken: string
      refreshToken: string
      accessTokenExpiresIn?: number
      refreshTokenExpiresIn?: number
    }
    branding: BrandingConfig
  }

  let setupData: SetupBackendResponse
  try {
    const { confirmPassword: _, ...payload } = result.data
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).map(([k, v]) => [
        k,
        typeof v === "string" && v.trim() === "" ? undefined : v,
      ])
    )

    setupData = await apiClient.post<SetupBackendResponse>(
      "/system/setup",
      cleanPayload
    )
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.statusCode === 403
          ? "System is already initialized. First-time setup is permanently locked."
          : error.message
        : "Failed to communicate with AngkorGate core during setup."

    return {
      success: false,
      message,
    }
  }

  if (!setupData || !setupData.tokens?.accessToken) {
    return {
      success: false,
      message: "Setup succeeded, but session tokens could not be established.",
    }
  }

  // Set auth cookies for the new Super Admin
  const cookieStore = await cookies()
  const isProd = process.env.NODE_ENV === "production"

  cookieStore.set("angkorgate_token", setupData.tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: setupData.tokens.accessTokenExpiresIn || 900,
  })

  if (setupData.tokens.refreshToken) {
    cookieStore.set("angkorgate_refresh_token", setupData.tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: setupData.tokens.refreshTokenExpiresIn || 604800,
    })
  }

  cookieStore.set(
    "angkorgate_user",
    JSON.stringify({
      id: setupData.user.id,
      email: setupData.user.email,
      roles: setupData.user.roles,
    }),
    {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: setupData.tokens.refreshTokenExpiresIn || 604800,
    }
  )

  redirect("/dashboard?welcome=1")
}

/**
 * Updates application branding settings (Content Management).
 */
export async function updateBrandingAction(
  _prevState: BrandingActionResult | null,
  formData: FormData
): Promise<BrandingActionResult> {
  const rawData = {
    appName: formData.get("appName"),
    appDescription: formData.get("appDescription") || undefined,
    logoUrl: formData.get("logoUrl") || undefined,
    faviconUrl: formData.get("faviconUrl") || undefined,
    organizationName: formData.get("organizationName") || undefined,
    supportEmail: formData.get("supportEmail") || undefined,
    footerText: formData.get("footerText") || undefined,
  }

  const result = UpdateBrandingSchema.safeParse(rawData)
  if (!result.success) {
    const flattened = result.error.flatten()
    return {
      success: false,
      message: "Please correct the errors in the branding form.",
      errors: flattened.fieldErrors,
    }
  }

  try {
    const cleanData = Object.fromEntries(
      Object.entries(result.data).map(([k, v]) => [
        k,
        typeof v === "string" && v.trim() === "" ? undefined : v,
      ])
    )

    const updated = await apiClient.patch<BrandingConfig>(
      "/system/branding",
      cleanData
    )
    return {
      success: true,
      message: "Branding and content management updated successfully.",
      data: updated,
    }
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : "Failed to update branding settings."
    return {
      success: false,
      message,
    }
  }
}
