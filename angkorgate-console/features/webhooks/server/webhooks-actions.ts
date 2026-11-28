"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { apiClient, ApiError } from "@/lib/api-client"
import type { WebhookDelivery, WebhookEndpoint } from "../types/webhooks.types"

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export async function getWebhookEndpoints(): Promise<WebhookEndpoint[]> {
  try {
    const res = await apiClient.get<WebhookEndpoint[]>("/webhooks")
    return Array.isArray(res) ? res : []
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      redirect("/login?unauthorized=1&redirect=/webhooks")
    }
    return []
  }
}

export async function createWebhookEndpointAction(input: {
  name: string
  url: string
  events: string[]
  secret?: string
}): Promise<{ success: boolean; data?: WebhookEndpoint; message?: string }> {
  try {
    const data = await apiClient.post<WebhookEndpoint>("/webhooks", {
      name: input.name,
      url: input.url,
      events: input.events,
      secret: input.secret || undefined,
    })
    revalidatePath("/webhooks")
    return { success: true, data }
  } catch (error) {
    return { success: false, message: getErrorMessage(error, "Failed to create webhook endpoint") }
  }
}

export async function toggleWebhookEndpointAction(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.patch(`/webhooks/${encodeURIComponent(id)}`, { isActive })
    revalidatePath("/webhooks")
    return { success: true }
  } catch (error) {
    return { success: false, message: getErrorMessage(error, "Failed to update webhook endpoint") }
  }
}

export async function deleteWebhookEndpointAction(
  id: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.delete(`/webhooks/${encodeURIComponent(id)}`)
    revalidatePath("/webhooks")
    return { success: true }
  } catch (error) {
    return { success: false, message: getErrorMessage(error, "Failed to delete webhook endpoint") }
  }
}

export async function getWebhookDeliveriesAction(
  endpointId: string
): Promise<WebhookDelivery[]> {
  try {
    const res = await apiClient.get<WebhookDelivery[]>(
      `/webhooks/${encodeURIComponent(endpointId)}/deliveries`
    )
    return Array.isArray(res) ? res : []
  } catch {
    return []
  }
}

export async function testWebhookEndpointAction(
  id: string
): Promise<{ success: boolean; data?: WebhookDelivery; message?: string }> {
  try {
    const data = await apiClient.post<WebhookDelivery>(
      `/webhooks/${encodeURIComponent(id)}/test`,
      {}
    )
    revalidatePath("/webhooks")
    return { success: true, data }
  } catch (error) {
    return { success: false, message: getErrorMessage(error, "Failed to send test webhook") }
  }
}

export async function retryWebhookDeliveryAction(
  deliveryId: string
): Promise<{ success: boolean; data?: WebhookDelivery; message?: string }> {
  try {
    const data = await apiClient.post<WebhookDelivery>(
      `/webhooks/deliveries/${encodeURIComponent(deliveryId)}/retry`,
      {}
    )
    revalidatePath("/webhooks")
    return { success: true, data }
  } catch (error) {
    return { success: false, message: getErrorMessage(error, "Failed to retry delivery") }
  }
}
