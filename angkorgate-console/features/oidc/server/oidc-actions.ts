"use server"

import "server-only"
import { apiClient } from "@/lib/api-client"
import type { OidcDiscoveryDoc, JwksResponse } from "../types/oidc.types"

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
