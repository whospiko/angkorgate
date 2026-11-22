"use server"

import "server-only"
import { revalidatePath } from "next/cache"
import { apiClient } from "@/lib/api-client"
import type { Role, Permission, CreateRoleInput } from "../types/rbac.types"

export async function getRoles(): Promise<Role[]> {
  try {
    const roles = await apiClient.get<Role[]>("/rbac/roles")
    return Array.isArray(roles) ? roles : []
  } catch (error) {
    console.error("Failed to fetch roles:", error)
    return []
  }
}

export async function getPermissions(): Promise<Permission[]> {
  try {
    const permissions = await apiClient.get<Permission[]>("/rbac/permissions")
    return Array.isArray(permissions) ? permissions : []
  } catch (error) {
    console.error("Failed to fetch permissions:", error)
    return []
  }
}

export async function createRoleAction(
  input: CreateRoleInput
): Promise<{ success: boolean; message?: string; data?: Role }> {
  try {
    const created = await apiClient.post<Role>("/rbac/roles", input)
    revalidatePath("/rbac")
    return { success: true, data: created }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to create role" }
  }
}

export async function deleteRoleAction(
  id: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.delete(`/rbac/roles/${id}`)
    revalidatePath("/rbac")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to delete role" }
  }
}

export async function updateRolePermissionsAction(
  roleId: string,
  permissions: string[]
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.put(`/rbac/roles/${roleId}/permissions`, { permissions })
    revalidatePath("/rbac")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to update permissions" }
  }
}
