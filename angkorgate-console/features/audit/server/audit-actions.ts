"use server"

import "server-only"
import { apiClient } from "@/lib/api-client"
import type { AuditLog, PaginatedAuditLogs } from "../types/audit.types"

export async function getAuditLogs(query?: {
  action?: string
  entity?: string
  page?: number
  limit?: number
}): Promise<PaginatedAuditLogs> {
  try {
    const params = new URLSearchParams()
    if (query?.action) params.set("action", query.action)
    if (query?.entity) params.set("entity", query.entity)
    if (query?.page) params.set("page", query.page.toString())
    if (query?.limit) params.set("limit", query.limit.toString())

    const queryStr = params.toString() ? `?${params.toString()}` : ""
    const res = await apiClient.get<any>(`/audit-logs${queryStr}`)

    if (Array.isArray(res)) {
      return { items: res, total: res.length, page: 1, limit: res.length }
    }
    if (res && Array.isArray(res.items)) {
      return res as PaginatedAuditLogs
    }
    return { items: [], total: 0, page: 1, limit: 20 }
  } catch (error) {
    console.error("Failed to fetch audit logs:", error)
    return { items: [], total: 0, page: 1, limit: 20 }
  }
}

export async function getAuditActions(): Promise<string[]> {
  try {
    const res = await apiClient.get<string[]>("/audit-logs/actions")
    return Array.isArray(res) ? res : []
  } catch {
    return []
  }
}
