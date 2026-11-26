"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { apiClient, ApiError } from "@/lib/api-client"
import type { AppSetting, CreateAppInput, UpdateAppInput } from "../types/apps.types"

export async function getApps(): Promise<AppSetting[]> {
  try {
    return await apiClient.get<AppSetting[]>("/admin/apps")
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      redirect("/login?unauthorized=1&redirect=/apps")
    }
    console.error("Failed to fetch apps:", error)
    return []
  }
}

export async function getAppByCode(code: string): Promise<AppSetting | null> {
  try {
    return await apiClient.get<AppSetting>(`/admin/apps/${encodeURIComponent(code)}`)
  } catch {
    return null
  }
}

export async function createAppAction(
  input: CreateAppInput
): Promise<{ success: boolean; message?: string; data?: AppSetting }> {
  try {
    const created = await apiClient.post<AppSetting>("/admin/apps", input)
    revalidatePath("/apps")
    revalidatePath("/dashboard")
    return { success: true, data: created }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to create application" }
  }
}

export async function updateAppAction(
  code: string,
  input: UpdateAppInput
): Promise<{ success: boolean; message?: string; data?: AppSetting }> {
  try {
    const updated = await apiClient.patch<AppSetting>(`/admin/apps/${encodeURIComponent(code)}`, input)
    revalidatePath("/apps")
    return { success: true, data: updated }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to update application" }
  }
}

export async function deleteAppAction(
  code: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.delete(`/admin/apps/${encodeURIComponent(code)}`)
    revalidatePath("/apps")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to delete application" }
  }
}

export async function toggleAppFeatureAction(
  code: string,
  field: "passwordLogin" | "oauth" | "registration",
  value: boolean
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.patch(`/admin/apps/${encodeURIComponent(code)}/toggle`, {
      field,
      value,
    })
    revalidatePath("/apps")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to toggle feature" }
  }
}

export async function regenerateSecretAction(
  code: string,
  gracePeriodHours: number = 24
): Promise<{
  success: boolean
  clientSecret?: string
  secondaryClientSecret?: string | null
  secondarySecretExpiresAt?: string | null
  message?: string
}> {
  try {
    const res = await apiClient.post<{
      clientSecret: string
      secondaryClientSecret?: string | null
      secondarySecretExpiresAt?: string | null
    }>(`/admin/apps/${encodeURIComponent(code)}/regenerate-secret?gracePeriodHours=${gracePeriodHours}`)
    revalidatePath("/apps")
    return {
      success: true,
      clientSecret: res.clientSecret,
      secondaryClientSecret: res.secondaryClientSecret,
      secondarySecretExpiresAt: res.secondarySecretExpiresAt,
    }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to regenerate secret" }
  }
}

export async function updateAppScopesAction(
  code: string,
  scopeIds: string[]
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.put(`/admin/apps/${encodeURIComponent(code)}/scopes`, { scopeIds })
    revalidatePath("/apps")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to update scopes" }
  }
}

export async function revealAppSecretAction(code: string): Promise<{
  success: boolean
  clientSecret?: string | null
  secondaryClientSecret?: string | null
  secondarySecretExpiresAt?: string | null
  stepUpRequired?: boolean
  message?: string
}> {
  try {
    const res = await apiClient.get<{
      clientSecret: string | null
      secondaryClientSecret: string | null
      secondarySecretExpiresAt: string | null
    }>(`/admin/apps/${encodeURIComponent(code)}/reveal-secret`)
    return {
      success: true,
      clientSecret: res.clientSecret,
      secondaryClientSecret: res.secondaryClientSecret,
      secondarySecretExpiresAt: res.secondarySecretExpiresAt,
    }
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 403) {
      return { success: false, stepUpRequired: true, message: error.message }
    }
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to reveal app secret",
    }
  }
}
