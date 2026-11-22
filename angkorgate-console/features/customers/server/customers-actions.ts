"use server"

import "server-only"
import { apiClient } from "@/lib/api-client"
import type { Customer, PaginatedCustomers } from "../types/customers.types"

export async function getCustomers(query?: {
  search?: string
  status?: string
  page?: number
  limit?: number
}): Promise<PaginatedCustomers> {
  try {
    const params = new URLSearchParams()
    if (query?.search) params.set("search", query.search)
    if (query?.status) params.set("status", query.status)
    if (query?.page) params.set("page", query.page.toString())
    if (query?.limit) params.set("limit", query.limit.toString())

    const queryStr = params.toString() ? `?${params.toString()}` : ""
    const res = await apiClient.get<any>(`/customers${queryStr}`)

    if (Array.isArray(res)) {
      return { items: res, total: res.length, page: 1, limit: res.length }
    }
    if (res && Array.isArray(res.items)) {
      return res as PaginatedCustomers
    }
    return { items: [], total: 0, page: 1, limit: 20 }
  } catch (error) {
    console.error("Failed to fetch customers:", error)
    return { items: [], total: 0, page: 1, limit: 20 }
  }
}
