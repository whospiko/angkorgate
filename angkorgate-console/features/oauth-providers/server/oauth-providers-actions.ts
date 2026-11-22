"use server"

import "server-only"
import { revalidatePath } from "next/cache"
import { apiClient } from "@/lib/api-client"
import type { OAuthProvider, CreateOAuthProviderInput } from "../types/oauth-providers.types"

export async function getOAuthProviders(): Promise<OAuthProvider[]> {
  try {
    const res = await apiClient.get<OAuthProvider[]>("/admin/oauth/providers")
    return Array.isArray(res) ? res : []
  } catch (error) {
    console.error("Failed to fetch OAuth providers:", error)
    return []
  }
}

export async function createOAuthProviderAction(
  input: CreateOAuthProviderInput
): Promise<{ success: boolean; message?: string; data?: OAuthProvider }> {
  try {
    const created = await apiClient.post<OAuthProvider>("/admin/oauth/providers", input)
    revalidatePath("/oauth-providers")
    return { success: true, data: created }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to create OAuth provider" }
  }
}

export async function deleteOAuthProviderAction(
  code: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.delete(`/admin/oauth/providers/${encodeURIComponent(code)}`)
    revalidatePath("/oauth-providers")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to delete OAuth provider" }
  }
}

export async function toggleOAuthProviderAction(
  code: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.patch(`/admin/oauth/providers/${encodeURIComponent(code)}/toggle`)
    revalidatePath("/oauth-providers")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to toggle OAuth provider" }
  }
}
