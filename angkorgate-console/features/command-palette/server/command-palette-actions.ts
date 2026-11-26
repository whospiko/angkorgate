"use server"

import { getUsers, getUserById } from "@/features/users"
import { getApps } from "@/features/apps"
import {
  CommandSearchQuerySchema,
  type CommandAppMatch,
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

  const [usersResult, allApps] = await Promise.all([
    query.length > 0
      ? getUsers({ search: query, page: 1, limit: 6 })
      : Promise.resolve({ items: [], total: 0, page: 1, limit: 6 }),
    getApps(),
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

  return { users, apps }
}
