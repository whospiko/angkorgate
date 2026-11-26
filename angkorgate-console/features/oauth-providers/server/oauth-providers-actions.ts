"use server"

import "server-only"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { apiClient, ApiError } from "@/lib/api-client"
import { getConsoleUrl } from "@/lib/env"
import type {
  OAuthProvider,
  PublicOAuthProvider,
  CreateOAuthProviderInput,
  UpdateOAuthProviderInput,
  GlobalOAuthSettings,
  UpdateOAuthSettingsInput,
} from "../types/oauth-providers.types"

export async function getOAuthSettings(): Promise<GlobalOAuthSettings> {
  try {
    return await apiClient.get<GlobalOAuthSettings>("/admin/oauth/providers/settings")
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      redirect("/login?unauthorized=1&redirect=/oauth-providers")
    }
    return {
      oauthEnabled: true,
      callbackBaseUrl: null,
      webUrl: getConsoleUrl(),
    }
  }
}

export async function updateOAuthSettingsAction(
  input: UpdateOAuthSettingsInput
): Promise<{ success: boolean; message?: string; data?: GlobalOAuthSettings }> {
  try {
    const updated = await apiClient.patch<GlobalOAuthSettings>(
      "/admin/oauth/providers/settings",
      input
    )
    revalidatePath("/oauth-providers")
    revalidatePath("/login")
    return { success: true, data: updated }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update OAuth settings"
    return { success: false, message }
  }
}

export async function getOAuthProviders(): Promise<OAuthProvider[]> {
  try {
    const res = await apiClient.get<OAuthProvider[]>("/admin/oauth/providers")
    return Array.isArray(res) ? res : []
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      redirect("/login?unauthorized=1&redirect=/oauth-providers")
    }
    console.error("Failed to fetch OAuth providers:", error)
    return []
  }
}

export async function getAvailableOAuthProviders(): Promise<PublicOAuthProvider[]> {
  const res = await getPublicOAuthConfig()
  return res.providers
}

export async function getPublicOAuthConfig(): Promise<{
  providers: PublicOAuthProvider[]
  callbackBaseUrl: string | null
  webUrl: string | null
}> {
  try {
    const res = await apiClient.get<{
      providers: PublicOAuthProvider[]
      callbackBaseUrl?: string
      webUrl?: string
    }>("/auth/oauth/providers")
    return {
      providers: Array.isArray(res?.providers) ? res.providers : [],
      callbackBaseUrl: res?.callbackBaseUrl ?? null,
      webUrl: res?.webUrl ?? null,
    }
  } catch {
    return { providers: [], callbackBaseUrl: null, webUrl: null }
  }
}

export async function createOAuthProviderAction(
  input: CreateOAuthProviderInput
): Promise<{ success: boolean; message?: string; data?: OAuthProvider }> {
  try {
    const created = await apiClient.post<OAuthProvider>(
      "/admin/oauth/providers",
      input
    )
    revalidatePath("/oauth-providers")
    revalidatePath("/login")
    return { success: true, data: created }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create OAuth provider"
    return { success: false, message }
  }
}

export async function updateOAuthProviderAction(
  code: string,
  input: UpdateOAuthProviderInput
): Promise<{ success: boolean; message?: string; data?: OAuthProvider }> {
  try {
    const updated = await apiClient.patch<OAuthProvider>(
      `/admin/oauth/providers/${encodeURIComponent(code)}`,
      input
    )
    revalidatePath("/oauth-providers")
    revalidatePath("/login")
    return { success: true, data: updated }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update OAuth provider"
    return { success: false, message }
  }
}

export async function deleteOAuthProviderAction(
  code: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.delete(`/admin/oauth/providers/${encodeURIComponent(code)}`)
    revalidatePath("/oauth-providers")
    revalidatePath("/login")
    return { success: true }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete OAuth provider"
    return { success: false, message }
  }
}

export async function toggleOAuthProviderAction(
  code: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.patch(
      `/admin/oauth/providers/${encodeURIComponent(code)}/toggle`
    )
    revalidatePath("/oauth-providers")
    revalidatePath("/login")
    return { success: true }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to toggle OAuth provider"
    return { success: false, message }
  }
}

export async function revealOAuthProviderSecretAction(code: string): Promise<{
  success: boolean
  clientSecret?: string | null
  privateKey?: string | null
  stepUpRequired?: boolean
  message?: string
}> {
  try {
    const res = await apiClient.get<{
      clientSecret: string | null
      privateKey: string | null
    }>(`/admin/oauth/providers/${encodeURIComponent(code)}/reveal-secret`)
    return {
      success: true,
      clientSecret: res.clientSecret,
      privateKey: res.privateKey,
    }
  } catch (error: unknown) {
    if (error instanceof ApiError && error.statusCode === 403) {
      return { success: false, stepUpRequired: true, message: error.message }
    }
    const message =
      error instanceof Error ? error.message : "Failed to reveal OAuth provider secret"
    return { success: false, message }
  }
}
