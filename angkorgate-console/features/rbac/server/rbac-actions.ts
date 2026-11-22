"use server"

import "server-only"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { apiClient, ApiError } from "@/lib/api-client"
import {
  type Role,
  type Permission,
  type UserPermissionOverride,
  type CreateRoleInput,
  type UpdateRoleInput,
  type CreatePermissionInput,
  type OverridePermissionInput,
  type AssignRoleInput,
  CreateRoleSchema,
  UpdateRoleSchema,
  CreatePermissionSchema,
  SetRolePermissionsSchema,
  OverridePermissionSchema,
  AssignRoleSchema,
  BulkAssignRolesSchema,
  type BulkAssignRolesInput,
} from "../types/rbac.types"

// ─────────── Roles Server Actions ───────────

export async function getRoles(): Promise<Role[]> {
  try {
    const rawRoles = await apiClient.get<Role[]>("/rbac/roles")
    if (!Array.isArray(rawRoles)) return []

    return rawRoles.map((r) => {
      const perms = r.rolePermissions
        ? r.rolePermissions
            .map((rp) => rp.permission?.code)
            .filter((c): c is string => Boolean(c))
        : r.permissions || []

      return {
        ...r,
        permissions: perms,
      }
    })
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      redirect("/login?unauthorized=1&redirect=/rbac")
    }
    console.error("Failed to fetch roles:", error)
    return []
  }
}

export async function getRole(id: string): Promise<Role | null> {
  try {
    const role = await apiClient.get<Role>(`/rbac/roles/${id}`)
    if (!role) return null

    const perms = role.rolePermissions
      ? role.rolePermissions
          .map((rp) => rp.permission?.code)
          .filter((c): c is string => Boolean(c))
      : role.permissions || []

    return {
      ...role,
      permissions: perms,
    }
  } catch (error) {
    console.error(`Failed to fetch role ${id}:`, error)
    return null
  }
}

export async function getRolePermissions(id: string): Promise<string[]> {
  try {
    const permissions = await apiClient.get<string[]>(`/rbac/roles/${id}/permissions`)
    return Array.isArray(permissions) ? permissions : []
  } catch (error) {
    console.error(`Failed to fetch permissions for role ${id}:`, error)
    return []
  }
}

export async function createRoleAction(
  rawInput: CreateRoleInput
): Promise<{ success: boolean; message?: string; data?: Role }> {
  try {
    const input = CreateRoleSchema.parse(rawInput)
    const created = await apiClient.post<Role>("/rbac/roles", input)
    revalidatePath("/rbac")
    return { success: true, data: created }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to create role" }
  }
}

export async function updateRoleAction(
  id: string,
  rawInput: UpdateRoleInput
): Promise<{ success: boolean; message?: string; data?: Role }> {
  try {
    const input = UpdateRoleSchema.parse(rawInput)
    const updated = await apiClient.patch<Role>(`/rbac/roles/${id}`, input)
    revalidatePath("/rbac")
    return { success: true, data: updated }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to update role" }
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
  permissionCodes: string[]
): Promise<{ success: boolean; message?: string }> {
  try {
    const validated = SetRolePermissionsSchema.parse({ permissionCodes })
    await apiClient.put(`/rbac/roles/${roleId}/permissions`, {
      permissionCodes: validated.permissionCodes,
    })
    revalidatePath("/rbac")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to update role permissions" }
  }
}

// ─────────── Permissions Server Actions ───────────

export async function getPermissions(): Promise<Permission[]> {
  try {
    const permissions = await apiClient.get<Permission[]>("/rbac/permissions")
    return Array.isArray(permissions) ? permissions : []
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      redirect("/login?unauthorized=1&redirect=/rbac")
    }
    console.error("Failed to fetch permissions:", error)
    return []
  }
}

export async function getPermissionByCode(code: string): Promise<Permission | null> {
  try {
    const permission = await apiClient.get<Permission>(`/rbac/permissions/${encodeURIComponent(code)}`)
    return permission || null
  } catch (error) {
    console.error(`Failed to fetch permission ${code}:`, error)
    return null
  }
}

export async function createPermissionAction(
  rawInput: CreatePermissionInput
): Promise<{ success: boolean; message?: string; data?: Permission }> {
  try {
    const input = CreatePermissionSchema.parse(rawInput)
    const created = await apiClient.post<Permission>("/rbac/permissions", input)
    revalidatePath("/rbac")
    return { success: true, data: created }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to create permission" }
  }
}

// ─────────── User Role & Overrides Server Actions ───────────

export async function getUserEffectivePermissions(userId: string): Promise<string[]> {
  try {
    const permissions = await apiClient.get<string[]>(`/rbac/users/${userId}/permissions`)
    return Array.isArray(permissions) ? permissions : []
  } catch (error) {
    console.error(`Failed to fetch user permissions for ${userId}:`, error)
    return []
  }
}

export async function getUserRoleCodes(userId: string): Promise<string[]> {
  try {
    const roles = await apiClient.get<string[]>(`/rbac/users/${userId}/roles`)
    return Array.isArray(roles) ? roles : []
  } catch (error) {
    console.error(`Failed to fetch user roles for ${userId}:`, error)
    return []
  }
}

export async function getUserOverrides(userId: string): Promise<UserPermissionOverride[]> {
  try {
    const overrides = await apiClient.get<UserPermissionOverride[]>(`/rbac/overrides/${userId}`)
    return Array.isArray(overrides) ? overrides : []
  } catch (error) {
    console.error(`Failed to fetch overrides for user ${userId}:`, error)
    return []
  }
}

export async function setUserOverrideAction(
  rawInput: OverridePermissionInput
): Promise<{ success: boolean; message?: string }> {
  try {
    const input = OverridePermissionSchema.parse(rawInput)
    await apiClient.post("/rbac/overrides", input)
    revalidatePath("/rbac")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to set permission override" }
  }
}

export async function clearUserOverrideAction(
  userId: string,
  permissionCode: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.delete(
      `/rbac/overrides?userId=${encodeURIComponent(userId)}&permissionCode=${encodeURIComponent(permissionCode)}`
    )
    revalidatePath("/rbac")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to clear permission override" }
  }
}

export async function assignRoleToUserAction(
  rawInput: AssignRoleInput
): Promise<{ success: boolean; message?: string }> {
  try {
    const input = AssignRoleSchema.parse(rawInput)
    await apiClient.post("/rbac/roles/assign", input)
    revalidatePath("/rbac")
    revalidatePath("/users")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to assign role" }
  }
}

export async function unassignRoleFromUserAction(
  userId: string,
  roleCode: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.post("/rbac/roles/unassign", { userId, roleCode })
    revalidatePath("/rbac")
    revalidatePath("/users")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to unassign role" }
  }
}

export async function replaceUserRolesAction(
  rawInput: BulkAssignRolesInput
): Promise<{ success: boolean; message?: string }> {
  try {
    const input = BulkAssignRolesSchema.parse(rawInput)
    await apiClient.put("/rbac/roles/assign-bulk", input)
    revalidatePath("/rbac")
    revalidatePath("/users")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to replace user roles" }
  }
}
