"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { apiClient, ApiError } from "@/lib/api-client"
import type {
  ApiKey,
  ApiKeyCreatedResponse,
  CreateApiKeyInput,
  ResourceSchemaMeta,
  UpdateApiKeyInput,
} from "../types/api-keys.types"

export async function getApiKeys(): Promise<ApiKey[]> {
  try {
    return await apiClient.get<ApiKey[]>("/admin/api-keys")
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      redirect("/login?unauthorized=1&redirect=/api-keys")
    }
    console.error("Failed to fetch API keys:", error)
    return []
  }
}

export async function getSchemaResources(): Promise<ResourceSchemaMeta[]> {
  try {
    return await apiClient.get<ResourceSchemaMeta[]>("/admin/api-keys/resources")
  } catch (error) {
    console.error("Failed to fetch schema resources:", error)
    return []
  }
}

export async function createApiKeyAction(
  input: CreateApiKeyInput
): Promise<{ success: boolean; message?: string; data?: ApiKeyCreatedResponse }> {
  try {
    const created = await apiClient.post<ApiKeyCreatedResponse>(
      "/admin/api-keys",
      input
    )
    revalidatePath("/api-keys")
    revalidatePath("/dashboard")
    return { success: true, data: created }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to generate API key",
    }
  }
}

export async function updateApiKeyAction(
  id: string,
  input: UpdateApiKeyInput
): Promise<{ success: boolean; message?: string; data?: ApiKey }> {
  try {
    const updated = await apiClient.patch<ApiKey>(
      `/admin/api-keys/${encodeURIComponent(id)}`,
      input
    )
    revalidatePath("/api-keys")
    return { success: true, data: updated }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to update API key policy",
    }
  }
}

export async function revokeApiKeyAction(
  id: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.post(`/admin/api-keys/${encodeURIComponent(id)}/revoke`)
    revalidatePath("/api-keys")
    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to revoke API key",
    }
  }
}

export async function deleteApiKeyAction(
  id: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.delete(`/admin/api-keys/${encodeURIComponent(id)}`)
    revalidatePath("/api-keys")
    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to delete API key",
    }
  }
}
