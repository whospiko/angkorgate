"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { apiClient, ApiError } from "@/lib/api-client"
import type { Scope, CreateScopeInput } from "../types/scopes.types"

export async function getScopes(): Promise<Scope[]> {
  try {
    return await apiClient.get<Scope[]>("/admin/scopes")
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      redirect("/login?unauthorized=1&redirect=/apps")
    }
    console.error("Failed to fetch scopes:", error)
    return []
  }
}

export async function createScopeAction(
  input: CreateScopeInput
): Promise<{ success: boolean; data?: Scope; message?: string }> {
  try {
    const created = await apiClient.post<Scope>("/admin/scopes", input)
    revalidatePath("/apps")
    return { success: true, data: created }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to create scope" }
  }
}

export async function deleteScopeAction(
  id: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.delete(`/admin/scopes/${encodeURIComponent(id)}`)
    revalidatePath("/apps")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to delete scope" }
  }
}
