"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { apiClient, ApiError } from "@/lib/api-client"
import type {
  Customer,
  PaginatedCustomers,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerContact,
  CreateContactInput,
  UpdateContactInput,
} from "../types/customers.types"
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
  CreateContactSchema,
  UpdateContactSchema,
  CustomerStatusSchema,
} from "../types/customers.schemas"

function cleanOptionalStrings<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== "") {
      out[k] = v
    }
  }
  return out as T
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export async function getCustomers(query?: {
  search?: string
  status?: string
  type?: string
  page?: number
  limit?: number
}): Promise<PaginatedCustomers> {
  try {
    const params = new URLSearchParams()
    if (query?.search) params.set("search", query.search)
    if (query?.status) params.set("status", query.status)
    if (query?.type) params.set("type", query.type)
    if (query?.page) params.set("page", query.page.toString())
    if (query?.limit) params.set("limit", query.limit.toString())

    const queryStr = params.toString() ? `?${params.toString()}` : ""
    const res = await apiClient.get<
      | Customer[]
      | { data: Customer[]; total?: number; page?: number; limit?: number }
      | PaginatedCustomers
    >(`/customers${queryStr}`)

    if (Array.isArray(res)) {
      return { items: res, total: res.length, page: 1, limit: res.length }
    }
    if (res && "data" in res && Array.isArray(res.data)) {
      return {
        items: res.data,
        total: res.total ?? res.data.length,
        page: res.page ?? 1,
        limit: res.limit ?? 20,
      }
    }
    if (res && "items" in res && Array.isArray(res.items)) {
      return res
    }
    return { items: [], total: 0, page: 1, limit: 20 }
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      redirect("/login?unauthorized=1&redirect=/customers")
    }
    console.error("Failed to fetch customers:", error)
    return { items: [], total: 0, page: 1, limit: 20 }
  }
}

export async function getCustomer(id: string): Promise<Customer | null> {
  try {
    return await apiClient.get<Customer>(`/customers/${encodeURIComponent(id)}`)
  } catch (error) {
    console.error(`Failed to fetch customer ${id}:`, error)
    return null
  }
}

export async function getCustomerAttributeSchemas(): Promise<Record<string, Record<string, string>>> {
  try {
    const res = await apiClient.get<Record<string, Record<string, string>>>(
      "/customers/attribute-schemas"
    )
    return res || {}
  } catch {
    return {}
  }
}

export async function createCustomerAction(
  data: CreateCustomerInput
): Promise<{ success: boolean; message?: string; data?: Customer }> {
  try {
    const parsed = CreateCustomerSchema.parse(data)
    const payload = cleanOptionalStrings(parsed)

    const created = await apiClient.post<Customer>("/customers", payload)
    revalidatePath("/customers")
    revalidatePath("/dashboard")
    return { success: true, data: created }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to create customer profile") }
  }
}

export async function updateCustomerAction(
  id: string,
  data: UpdateCustomerInput
): Promise<{ success: boolean; message?: string; data?: Customer }> {
  try {
    const parsed = UpdateCustomerSchema.parse(data)
    const payload = cleanOptionalStrings(parsed)

    const updated = await apiClient.patch<Customer>(
      `/customers/${encodeURIComponent(id)}`,
      payload
    )
    revalidatePath("/customers")
    return { success: true, data: updated }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to update customer") }
  }
}

export async function linkCustomerUserAction(
  customerId: string,
  userId: string | null
): Promise<{ success: boolean; message?: string; data?: Customer }> {
  try {
    const updated = await apiClient.patch<Customer>(
      `/customers/${encodeURIComponent(customerId)}/user`,
      { userId }
    )
    revalidatePath("/customers")
    revalidatePath("/users")
    return { success: true, data: updated }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to update linked user") }
  }
}

export async function deleteCustomerAction(
  id: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.delete(`/customers/${encodeURIComponent(id)}`)
    revalidatePath("/customers")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to delete customer") }
  }
}

export async function updateCustomerStatusAction(
  id: string,
  status: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const validStatus = CustomerStatusSchema.parse(status.toUpperCase())
    await apiClient.patch(
      `/customers/${encodeURIComponent(id)}/status/${encodeURIComponent(validStatus)}`
    )
    revalidatePath("/customers")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to update status") }
  }
}

export async function getCustomerAttributes(
  id: string
): Promise<Record<string, unknown>> {
  try {
    const res = await apiClient.get<Record<string, unknown>>(
      `/customers/${encodeURIComponent(id)}/attributes`
    )
    return res || {}
  } catch {
    return {}
  }
}

export async function setCustomerAttributeAction(
  id: string,
  key: string,
  value: unknown
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.put(
      `/customers/${encodeURIComponent(id)}/attributes/${encodeURIComponent(key)}`,
      { value }
    )
    revalidatePath("/customers")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to set attribute") }
  }
}

export async function deleteCustomerAttributeAction(
  id: string,
  key: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.delete(
      `/customers/${encodeURIComponent(id)}/attributes/${encodeURIComponent(key)}`
    )
    revalidatePath("/customers")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to delete attribute") }
  }
}

export async function getCustomerContacts(
  customerId: string
): Promise<CustomerContact[]> {
  try {
    const res = await apiClient.get<CustomerContact[]>(
      `/customers/${encodeURIComponent(customerId)}/contacts`
    )
    return Array.isArray(res) ? res : []
  } catch {
    return []
  }
}

export async function createCustomerContactAction(
  customerId: string,
  data: CreateContactInput
): Promise<{ success: boolean; message?: string; data?: CustomerContact }> {
  try {
    const parsed = CreateContactSchema.parse(data)
    const payload = cleanOptionalStrings(parsed)
    const created = await apiClient.post<CustomerContact>(
      `/customers/${encodeURIComponent(customerId)}/contacts`,
      payload
    )
    revalidatePath("/customers")
    return { success: true, data: created }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to add contact") }
  }
}

export async function updateCustomerContactAction(
  customerId: string,
  contactId: string,
  data: UpdateContactInput
): Promise<{ success: boolean; message?: string; data?: CustomerContact }> {
  try {
    const parsed = UpdateContactSchema.parse(data)
    const payload = cleanOptionalStrings(parsed)
    const updated = await apiClient.patch<CustomerContact>(
      `/customers/${encodeURIComponent(customerId)}/contacts/${encodeURIComponent(contactId)}`,
      payload
    )
    revalidatePath("/customers")
    return { success: true, data: updated }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to update contact") }
  }
}

export async function deleteCustomerContactAction(
  customerId: string,
  contactId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.delete(
      `/customers/${encodeURIComponent(customerId)}/contacts/${encodeURIComponent(contactId)}`
    )
    revalidatePath("/customers")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to delete contact") }
  }
}
