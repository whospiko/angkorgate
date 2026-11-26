"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { apiClient, ApiError } from "@/lib/api-client"
import {
  type User,
  type CreateUserInput,
  type UpdateUserInput,
  type AdminResetPasswordInput,
  type PaginatedUsers,
  type LinkedAccount,
  type LinkedSocialAccount,
  CreateUserSchema,
  UpdateUserSchema,
  AdminResetPasswordSchema,
} from "../types/users.types"

export async function getUsers(query?: {
  search?: string
  page?: number
  limit?: number
}): Promise<PaginatedUsers> {
  try {
    const params = new URLSearchParams()
    if (query?.search) params.set("search", query.search)
    if (query?.page) params.set("page", query.page.toString())
    if (query?.limit) params.set("limit", query.limit.toString())

    const queryStr = params.toString() ? `?${params.toString()}` : ""
    const res = await apiClient.get<any>(`/users${queryStr}`)

    if (Array.isArray(res)) {
      return { items: res, total: res.length, page: 1, limit: res.length }
    }
    if (res && Array.isArray(res.data)) {
      return { items: res.data, total: res.total ?? res.data.length, page: res.page ?? 1, limit: res.limit ?? 20 }
    }
    if (res && Array.isArray(res.items)) {
      return res as PaginatedUsers
    }
    return { items: [], total: 0, page: 1, limit: 20 }
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      redirect("/login?unauthorized=1&redirect=/users")
    }
    console.error("Failed to fetch users:", error)
    return { items: [], total: 0, page: 1, limit: 20 }
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const user = await apiClient.get<User>(`/users/${id}`)
    if (!user) return null

    // Ensure roles are attached
    if (!user.roles || user.roles.length === 0) {
      try {
        const roles = await apiClient.get<string[]>(`/users/${id}/roles`)
        if (Array.isArray(roles)) {
          user.roles = roles
        }
      } catch {
        // Fallback: roles remain as empty array
      }
    }

    return user
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      redirect(`/login?unauthorized=1&redirect=/users/${id}`)
    }
    console.error(`Failed to fetch user ${id}:`, error)
    return null
  }
}

export async function getUserRoles(id: string): Promise<string[]> {
  try {
    const roles = await apiClient.get<string[]>(`/users/${id}/roles`)
    return Array.isArray(roles) ? roles : []
  } catch (error) {
    console.error(`Failed to fetch roles for user ${id}:`, error)
    return []
  }
}

export async function createUserAction(
  rawInput: CreateUserInput
): Promise<{ success: boolean; message?: string; data?: User }> {
  try {
    const input = CreateUserSchema.parse(rawInput)
    const { roles, phoneNumber, phone, email, ...rest } = input
    const payload: Record<string, any> = {
      ...rest,
    }
    if (email && email.trim().length > 0) {
      payload.email = email.trim()
    }
    const finalPhone = phone || phoneNumber
    if (finalPhone && finalPhone.trim().length > 0) {
      payload.phone = finalPhone.trim()
    }

    // Clean undefined keys
    Object.keys(payload).forEach(
      (key) => payload[key] === undefined && delete payload[key]
    )

    const created = await apiClient.post<User>("/users", payload)

    // Assign roles through RBAC assignment endpoint
    if (roles && roles.length > 0 && created?.id) {
      for (const roleCode of roles) {
        try {
          await apiClient.post("/rbac/roles/assign", {
            userId: created.id,
            roleCode,
          })
        } catch (roleErr) {
          console.error(`Failed to assign role ${roleCode} to user ${created.id}:`, roleErr)
        }
      }
    }

    revalidatePath("/users")
    revalidatePath("/dashboard")
    return { success: true, data: created }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to create user" }
  }
}

export async function updateUserAction(
  id: string,
  rawInput: UpdateUserInput
): Promise<{ success: boolean; message?: string; data?: User }> {
  try {
    const input = UpdateUserSchema.parse(rawInput)
    const payload: Record<string, any> = {}

    if (input.email !== undefined) {
      payload.email = input.email && input.email.trim().length > 0 ? input.email.trim() : null
    }
    if (input.phone !== undefined) {
      payload.phone = input.phone && input.phone.trim().length > 0 ? input.phone.trim() : null
    }
    if (input.isActive !== undefined) {
      payload.isActive = input.isActive
    }
    if (input.isEmailVerified !== undefined) {
      payload.isEmailVerified = input.isEmailVerified
    }
    if (input.isPhoneVerified !== undefined) {
      payload.isPhoneVerified = input.isPhoneVerified
    }
    if (input.mustChangePassword !== undefined) {
      payload.mustChangePassword = input.mustChangePassword
    }

    const updated = await apiClient.patch<User>(`/users/${id}`, payload)

    revalidatePath("/users")
    revalidatePath(`/users/${id}`)
    revalidatePath("/dashboard")
    return { success: true, data: updated }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to update user" }
  }
}

export async function toggleUserStatusAction(
  userId: string,
  activate: boolean
): Promise<{ success: boolean; message?: string }> {
  try {
    const endpoint = activate ? `/users/${userId}/activate` : `/users/${userId}/deactivate`
    await apiClient.patch(endpoint)
    revalidatePath("/users")
    revalidatePath(`/users/${userId}`)
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to update user status" }
  }
}

export async function unlockUserAction(
  userId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.patch(`/users/${userId}/unlock`)
    revalidatePath("/users")
    revalidatePath(`/users/${userId}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to unlock user" }
  }
}

export async function adminResetPasswordAction(
  userId: string,
  rawInput: AdminResetPasswordInput
): Promise<{ success: boolean; message?: string }> {
  try {
    const input = AdminResetPasswordSchema.parse(rawInput)
    await apiClient.post(`/users/${userId}/reset-password`, input)
    revalidatePath("/users")
    revalidatePath(`/users/${userId}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to reset password" }
  }
}

export async function deleteUserAction(
  userId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.delete(`/users/${userId}`)
    revalidatePath("/users")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to delete user" }
  }
}

export async function getUserLinkedAccount(userId: string): Promise<LinkedAccount> {
  // Check employee profile first
  try {
    const emp = await apiClient.get<any>(`/employees/by-user/${userId}`)
    if (emp && emp.id) {
      return {
        type: "employee",
        data: {
          id: emp.id,
          employeeCode: emp.employeeCode,
          fullName: emp.fullName,
          employmentStatus: emp.employmentStatus || "ACTIVE",
          departmentCode: emp.departmentCode || emp.positions?.[0]?.department?.code || null,
          jobTitleCode: emp.jobTitleCode || emp.positions?.[0]?.jobTitle?.code || null,
          phone: emp.phone || null,
        },
      }
    }
  } catch {
    // Not linked to employee
  }

  // Check customer profile
  try {
    const cust = await apiClient.get<any>(`/customers/by-user/${userId}`)
    if (cust && cust.id) {
      return {
        type: "customer",
        data: {
          id: cust.id,
          customerCode: cust.customerCode,
          fullName: cust.fullName,
          type: cust.type || "CUSTOMER",
          status: cust.status || "ACTIVE",
          phone: cust.phone || null,
          email: cust.email || null,
        },
      }
    }
  } catch {
    // Not linked to customer
  }

  return { type: "none" }
}

export async function assignUserRoleAction(
  userId: string,
  roleCode: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.post("/rbac/roles/assign", { userId, roleCode })
    revalidatePath("/users")
    revalidatePath(`/users/${userId}`)
    revalidatePath("/rbac")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to assign role" }
  }
}

export async function unassignUserRoleAction(
  userId: string,
  roleCode: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.post("/rbac/roles/unassign", { userId, roleCode })
    revalidatePath("/users")
    revalidatePath(`/users/${userId}`)
    revalidatePath("/rbac")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to unassign role" }
  }
}

export async function replaceUserRolesAction(
  userId: string,
  roleCodes: string[]
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.put("/rbac/roles/assign-bulk", { userId, roleCodes })
    revalidatePath("/users")
    revalidatePath(`/users/${userId}`)
    revalidatePath("/rbac")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to update user roles" }
  }
}

export async function getAdminUserOAuthAccounts(
  userId: string
): Promise<LinkedSocialAccount[]> {
  try {
    const res = await apiClient.get<LinkedSocialAccount[]>(
      `/admin/oauth/providers/users/${encodeURIComponent(userId)}/accounts`
    )
    return Array.isArray(res) ? res : []
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      redirect(`/login?unauthorized=1&redirect=/users/${encodeURIComponent(userId)}`)
    }
    return []
  }
}

export async function adminUnlinkUserOAuthAction(
  userId: string,
  provider: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.delete(
      `/admin/oauth/providers/users/${encodeURIComponent(userId)}/accounts/${encodeURIComponent(provider)}`
    )
    revalidatePath("/users")
    revalidatePath(`/users/${userId}`)
    return { success: true }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to unlink social account"
    return { success: false, message }
  }
}
