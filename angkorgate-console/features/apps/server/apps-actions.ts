"use server"

import "server-only"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { apiClient, ApiError } from "@/lib/api-client"
import type { AppSetting, CreateAppInput } from "../types/apps.types"

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
  code: string
): Promise<{ success: boolean; clientSecret?: string; message?: string }> {
  try {
    const res = await apiClient.post<{ clientSecret: string }>(
      `/admin/apps/${encodeURIComponent(code)}/regenerate-secret`
    )
    revalidatePath("/apps")
    return { success: true, clientSecret: res.clientSecret }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to regenerate secret" }
  }
}
