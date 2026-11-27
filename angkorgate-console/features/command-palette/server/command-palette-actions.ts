"use server"

import { getUsers, getUserById } from "@/features/users"
import { getApps } from "@/features/apps"
import { getCustomers } from "@/features/customers"
import { getEmployees } from "@/features/employees"
import {
  CommandSearchQuerySchema,
  type CommandAppMatch,
  type CommandCustomerMatch,
  type CommandEmployeeMatch,
  type CommandPaletteSearchResult,
  type CommandUserMatch,
} from "../types/command-palette.types"

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function searchCommandPaletteAction(
  rawQuery: string
): Promise<CommandPaletteSearchResult> {
  const parsed = CommandSearchQuerySchema.safeParse({ query: rawQuery })
  const query = parsed.success ? parsed.data.query : ""

  const [usersResult, allApps, customersResult, employeesResult] = await Promise.all([
    query.length > 0
      ? getUsers({ search: query, page: 1, limit: 6 })
      : Promise.resolve({ items: [], total: 0, page: 1, limit: 6 }),
    getApps(),
    query.length > 0
      ? getCustomers({ search: query, page: 1, limit: 5 })
      : Promise.resolve({ items: [], total: 0, page: 1, limit: 5 }),
    query.length > 0
      ? getEmployees({ search: query, page: 1, limit: 5 })
      : Promise.resolve({ items: [], total: 0, page: 1, limit: 5 }),
  ])

  let users: CommandUserMatch[] = (usersResult.items || []).map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.fullName ?? null,
    isActive: u.isActive,
  }))

  // Fallback direct lookup if user pasted a full UUID and search returned empty
  if (query.length > 0 && users.length === 0 && UUID_REGEX.test(query)) {
    const directUser = await getUserById(query)
    if (directUser) {
      users = [
        {
          id: directUser.id,
          email: directUser.email,
          fullName: directUser.fullName ?? null,
          isActive: directUser.isActive,
        },
      ]
    }
  }

  const normalizedQuery = query.toLowerCase()
  const apps: CommandAppMatch[] = allApps
    .filter((app) => {
      if (!normalizedQuery) return true
      return (
        app.name.toLowerCase().includes(normalizedQuery) ||
        app.appCode.toLowerCase().includes(normalizedQuery) ||
        (app.description &&
          app.description.toLowerCase().includes(normalizedQuery))
      )
    })
    .slice(0, 6)
    .map((app) => ({
      appCode: app.appCode,
      name: app.name,
      isPublicClient: app.isPublicClient,
      rootUrl: app.rootUrl ?? null,
    }))

  const customers: CommandCustomerMatch[] = (customersResult.items || []).map((c) => ({
    id: c.id,
    customerCode: c.customerCode,
    fullName: c.fullName,
    type: c.type,
    status: c.status,
    phone: c.phone ?? null,
  }))

  const employees: CommandEmployeeMatch[] = (employeesResult.items || []).map((e) => ({
    id: e.id,
    employeeCode: e.employeeCode,
    fullName: e.fullName,
    employmentStatus: e.employmentStatus,
    employmentType: e.employmentType ?? null,
  }))

  return { users, apps, customers, employees }
}
