"use server"

import { apiClient, ApiError } from "@/lib/api-client"
import {
  TestMailSchema,
  TestSmsSchema,
  UpdateRuntimeConfigSchema,
  type PublicAuthMethods,
  type RuntimeSettingView,
} from "../types/runtime-config.schemas"

export async function getPublicAuthMethods(): Promise<PublicAuthMethods> {
  try {
    return await apiClient.get<PublicAuthMethods>("/system/auth-methods")
  } catch {
    return {
      passkeyEnabled: true,
      magicLinkEnabled: true,
      emailOtpEnabled: true,
      smsOtpEnabled: true,
    }
  }
}

export async function getRuntimeConfigAction(): Promise<{
  success: boolean
  settings?: RuntimeSettingView[]
  message?: string
}> {
  try {
    const settings = await apiClient.get<RuntimeSettingView[]>(
      "/system/runtime-config"
    )
    return { success: true, settings }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to load runtime environment settings."
    return { success: false, message }
  }
}

export async function updateRuntimeConfigAction(
  settings: Record<string, string | number | boolean | null>
): Promise<{
  success: boolean
  settings?: RuntimeSettingView[]
  message?: string
}> {
  const parsed = UpdateRuntimeConfigSchema.safeParse({ settings })
  if (!parsed.success) {
    return { success: false, message: "Invalid settings payload." }
  }

  try {
    const updated = await apiClient.patch<RuntimeSettingView[]>(
      "/system/runtime-config",
      parsed.data
    )
    return {
      success: true,
      settings: updated,
      message: "Environment settings saved and applied live.",
    }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to save runtime environment settings."
    return { success: false, message }
  }
}

export async function testMailConfigAction(to: string): Promise<{
  success: boolean
  message: string
}> {
  const parsed = TestMailSchema.safeParse({ to })
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid email address.",
    }
  }

  try {
    const res = await apiClient.post<{ message: string }>(
      "/system/runtime-config/test-mail",
      parsed.data
    )
    return { success: true, message: res.message }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Test email dispatch failed. Verify your SMTP settings."
    return { success: false, message }
  }
}

export async function testSmsConfigAction(to: string): Promise<{
  success: boolean
  message: string
}> {
  const parsed = TestSmsSchema.safeParse({ to })
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid phone number.",
    }
  }

  try {
    const res = await apiClient.post<{ message: string }>(
      "/system/runtime-config/test-sms",
      parsed.data
    )
    return { success: true, message: res.message }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Test SMS dispatch failed. Verify your SMS gateway settings."
    return { success: false, message }
  }
}

export async function getMaintenanceModeAction(): Promise<{
  maintenanceMode: boolean
}> {
  try {
    return await apiClient.get<{ maintenanceMode: boolean }>(
      "/system/maintenance"
    )
  } catch {
    return { maintenanceMode: false }
  }
}

export async function toggleMaintenanceModeAction(
  enabled: boolean
): Promise<{
  success: boolean
  maintenanceMode: boolean
  message: string
}> {
  try {
    await apiClient.patch<RuntimeSettingView[]>("/system/runtime-config", {
      settings: { MAINTENANCE_MODE: enabled },
    })
    return {
      success: true,
      maintenanceMode: enabled,
      message: enabled
        ? "Maintenance mode enabled. Public registration and OAuth/OIDC flows are paused."
        : "Maintenance mode disabled. All public authentication flows are active.",
    }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to toggle maintenance mode."
    return {
      success: false,
      maintenanceMode: !enabled,
      message,
    }
  }
}

export async function purgeCacheAction(): Promise<{
  success: boolean
  provider?: string
  message: string
}> {
  try {
    const res = await apiClient.post<{ purged: boolean; provider: string }>(
      "/system/cache/purge"
    )
    return {
      success: true,
      provider: res.provider,
      message: `Purged ${res.provider} cache successfully.`,
    }
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : "Failed to purge cache."
    return {
      success: false,
      message,
    }
  }
}

export async function revealRuntimeSecretAction(key: string): Promise<{
  success: boolean
  value?: string
  stepUpRequired?: boolean
  message?: string
}> {
  try {
    const res = await apiClient.get<{ key: string; value: string }>(
      `/system/runtime-config/${encodeURIComponent(key)}/reveal`
    )
    return { success: true, value: res.value }
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 403) {
      return { success: false, stepUpRequired: true, message: error.message }
    }
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to reveal secret.",
    }
  }
}
