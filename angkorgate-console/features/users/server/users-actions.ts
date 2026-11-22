"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { apiClient, ApiError } from "@/lib/api-client"
import type { User, CreateUserInput, PaginatedUsers } from "../types/users.types"

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

export async function createUserAction(
  input: CreateUserInput
): Promise<{ success: boolean; message?: string; data?: User }> {
  try {
    const { roles, phoneNumber, ...rest } = input
    const payload: Record<string, any> = {
      ...rest,
    }
    if (phoneNumber) {
      payload.phone = phoneNumber
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

export async function toggleUserStatusAction(
  userId: string,
  activate: boolean
): Promise<{ success: boolean; message?: string }> {
  try {
    const endpoint = activate ? `/users/${userId}/activate` : `/users/${userId}/deactivate`
    await apiClient.patch(endpoint)
    revalidatePath("/users")
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
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to unlock user" }
  }
}

export async function deleteUserAction(
  userId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.delete(`/users/${userId}`)
    revalidatePath("/users")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to delete user" }
  }
}
