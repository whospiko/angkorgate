import { z } from "zod"

export const CommandSearchQuerySchema = z.object({
  query: z.string().trim().max(120),
})

export interface CommandUserMatch {
  id: string
  email: string | null
  fullName?: string | null
  isActive: boolean
}

export interface CommandAppMatch {
  appCode: string
  name: string
  isPublicClient: boolean
  rootUrl?: string | null
}

export interface CommandPaletteSearchResult {
  users: CommandUserMatch[]
  apps: CommandAppMatch[]
}

export interface StaticCommandEntry {
  id: string
  group: "navigation" | "action"
  title: string
  subtitle: string
  keywords: string[]
  href?: string
  actionId?: "create-api-key" | "toggle-maintenance" | "purge-cache" | "open-help"
}

export const STATIC_COMMAND_ENTRIES: StaticCommandEntry[] = [
  // Quick Actions
  {
    id: "action:create-api-key",
    group: "action",
    title: "Create API Key",
    subtitle: "Generate a new machine-to-machine integration key",
    keywords: ["api", "key", "token", "create", "new", "integration"],
    actionId: "create-api-key",
  },
  {
    id: "action:toggle-maintenance",
    group: "action",
    title: "Toggle Maintenance Mode",
    subtitle: "Pause or resume public registration and OAuth/OIDC flows",
    keywords: ["maintenance", "mode", "toggle", "pause", "503", "system"],
    actionId: "toggle-maintenance",
  },
  {
    id: "action:purge-cache",
    group: "action",
    title: "Purge Redis Cache",
    subtitle: "Flush all cached keys in Redis and in-memory store",
    keywords: ["purge", "redis", "cache", "flush", "clear", "reset"],
    actionId: "purge-cache",
  },
  {
    id: "action:open-help",
    group: "action",
    title: "Command Palette Guide",
    subtitle: "View keyboard shortcuts, search tips, and quick actions",
    keywords: ["help", "guide", "shortcuts", "cheat", "docs", "?"],
    actionId: "open-help",
  },
  // Direct Navigation
  {
    id: "nav:apps",
    group: "navigation",
    title: "Client Applications",
    subtitle: "Manage OAuth/OIDC client apps, secrets, and redirect URIs",
    keywords: ["apps", "clients", "applications", "oauth", "oidc"],
    href: "/apps",
  },
  {
    id: "nav:audit",
    group: "navigation",
    title: "Audit Logs",
    subtitle: "Inspect security events, actor trails, and system mutations",
    keywords: ["audit", "logs", "events", "security", "history"],
    href: "/audit",
  },
  {
    id: "nav:settings-environment",
    group: "navigation",
    title: "Settings: Environment & Providers",
    subtitle: "Configure SMTP, SMS, passkeys, JWT TTLs, and maintenance mode",
    keywords: ["settings", "environment", "smtp", "sms", "config", "maintenance"],
    href: "/settings/environment",
  },
  {
    id: "nav:settings-content",
    group: "navigation",
    title: "Settings: Content & Branding",
    subtitle: "Customize app name, logos, support email, and dashboard roles",
    keywords: ["settings", "content", "branding", "logo", "theme"],
    href: "/settings/content",
  },
  {
    id: "nav:settings-dev-inbox",
    group: "navigation",
    title: "Settings: Dev Outbox",
    subtitle: "Inspect captured magic links, email OTPs, and SMS codes",
    keywords: ["settings", "dev", "outbox", "inbox", "otp", "magic"],
    href: "/settings/dev-inbox",
  },
  {
    id: "nav:users",
    group: "navigation",
    title: "User Accounts",
    subtitle: "Browse, search, and manage user identities",
    keywords: ["users", "accounts", "identities", "members"],
    href: "/users",
  },
  {
    id: "nav:api-keys",
    group: "navigation",
    title: "API Keys & Integrations",
    subtitle: "View and manage developer API keys and method policies",
    keywords: ["api", "keys", "developer", "integrations"],
    href: "/api-keys",
  },
  {
    id: "nav:rbac",
    group: "navigation",
    title: "Roles & Permissions",
    subtitle: "Configure RBAC roles, permissions, and user overrides",
    keywords: ["rbac", "roles", "permissions", "access"],
    href: "/rbac",
  },
  {
    id: "nav:oauth-providers",
    group: "navigation",
    title: "OAuth Identity Providers",
    subtitle: "Configure Google, GitHub, Discord, and custom OAuth providers",
    keywords: ["oauth", "providers", "social", "google", "github"],
    href: "/oauth-providers",
  },
  {
    id: "nav:oidc",
    group: "navigation",
    title: "OIDC Discovery & JWKS",
    subtitle: "Inspect OpenID Connect discovery metadata and signing keys",
    keywords: ["oidc", "jwks", "discovery", "openid"],
    href: "/oidc",
  },
  {
    id: "nav:dashboard",
    group: "navigation",
    title: "System Overview",
    subtitle: "View system health, cache status, and metrics",
    keywords: ["dashboard", "overview", "home", "metrics", "health"],
    href: "/dashboard",
  },
]

export function filterStaticCommands(
  entries: StaticCommandEntry[],
  rawQuery: string
): StaticCommandEntry[] {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return entries
  return entries.filter((entry) => {
    if (entry.title.toLowerCase().includes(q)) return true
    if (entry.subtitle.toLowerCase().includes(q)) return true
    return entry.keywords.some((kw) => kw.toLowerCase().includes(q))
  })
}
