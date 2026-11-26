function stripTrailingSlash(url: string): string {
  return url.trim().replace(/\/+$/, "")
}

/**
 * Server-side URL for angkorgate-core (falls back to NEXT_PUBLIC_CORE_API_URL).
 */
export function getCoreApiUrl(): string {
  return stripTrailingSlash(
    process.env.CORE_API_URL ||
      process.env.NEXT_PUBLIC_CORE_API_URL ||
      "http://localhost:8080"
  )
}

/**
 * Browser-facing URL for angkorgate-core (OAuth initiation, Swagger, OIDC links).
 */
export function getPublicCoreUrl(): string {
  return stripTrailingSlash(
    process.env.NEXT_PUBLIC_CORE_API_URL || "http://localhost:8080"
  )
}

/**
 * Browser-facing URL for angkorgate-console (OAuth callback & redirect base).
 */
export function getConsoleUrl(): string {
  return stripTrailingSlash(
    process.env.NEXT_PUBLIC_CONSOLE_URL ||
      process.env.CONSOLE_URL ||
      "http://localhost:4000"
  )
}
