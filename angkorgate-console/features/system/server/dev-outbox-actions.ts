"use server"

import { apiClient, ApiError } from "@/lib/api-client"

export interface DevOutboxMessage {
  id: string
  channel: "email" | "sms"
  to: string
  subject?: string
  body: string
  extractedCode: string | null
  extractedLinks: string[]
  createdAt: string
}

export async function getDevOutboxAction(
  channel?: "email" | "sms"
): Promise<{
  success: boolean
  messages?: DevOutboxMessage[]
  message?: string
}> {
  try {
    const query = channel ? `?channel=${channel}` : ""
    const messages = await apiClient.get<DevOutboxMessage[]>(
      `/system/dev-outbox${query}`
    )
    return { success: true, messages }
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to load dev outbox messages."
    return { success: false, message }
  }
}

export async function clearDevOutboxAction(): Promise<{
  success: boolean
  message?: string
}> {
  try {
    await apiClient.delete("/system/dev-outbox")
    return { success: true }
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : "Failed to clear dev outbox."
    return { success: false, message }
  }
}
