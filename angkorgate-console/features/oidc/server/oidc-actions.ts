"use server"

import "server-only"
import { revalidatePath } from "next/cache"
import { apiClient } from "@/lib/api-client"
import { getConsoleUrl, getPublicCoreUrl } from "@/lib/env"
import type { OidcDiscoveryDoc, JwksResponse } from "../types/oidc.types"

export interface OidcSettings {
  issuer: string
  consoleUrl: string
}

export async function getOidcDiscovery(): Promise<OidcDiscoveryDoc | null> {
  try {
    return await apiClient.get<OidcDiscoveryDoc>("/oidc/.well-known/openid-configuration")
  } catch (error) {
    console.error("Failed to fetch OIDC discovery:", error)
    return null
  }
}

export async function getOidcJwks(): Promise<JwksResponse | null> {
  try {
    return await apiClient.get<JwksResponse>("/oidc/jwks")
  } catch (error) {
    console.error("Failed to fetch OIDC JWKS:", error)
    return null
  }
}

export async function getOidcSettings(): Promise<OidcSettings> {
  try {
    return await apiClient.get<OidcSettings>("/admin/oidc/settings")
  } catch {
    return {
      issuer: `${getPublicCoreUrl()}/oidc`,
      consoleUrl: getConsoleUrl(),
    }
  }
}

export async function updateOidcSettingsAction(
  input: Partial<OidcSettings>
): Promise<{ success: boolean; message?: string; data?: OidcSettings }> {
  try {
    const updated = await apiClient.patch<OidcSettings>("/admin/oidc/settings", input)
    revalidatePath("/oidc")
    return { success: true, data: updated }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update OIDC settings"
    return { success: false, message }
  }
}
