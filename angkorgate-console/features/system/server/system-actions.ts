"use server"

import "server-only"
import { apiClient } from "@/lib/api-client"
import type { SystemHealth, CacheStatus } from "../types/system.types"

export async function getSystemHealth(): Promise<SystemHealth> {
  try {
    return await apiClient.get<SystemHealth>("/")
  } catch (error) {
    console.error("Failed to fetch system health:", error)
    return {
      status: "degraded",
      cache: {
        provider: "unknown",
        connected: false,
        enabled: false,
        prefix: "angkorgate:",
        itemCount: 0,
      },
    }
  }
}

export async function getCacheStatus(): Promise<CacheStatus> {
  try {
    return await apiClient.get<CacheStatus>("/cache/status")
  } catch (error) {
    console.error("Failed to fetch cache status:", error)
    return {
      provider: "in-memory",
      connected: false,
      enabled: false,
      prefix: "angkorgate:",
      itemCount: 0,
    }
  }
}
