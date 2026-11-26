"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { getConsoleUrl, getPublicCoreUrl } from "@/lib/env"
import {
  OAuthProviderIcon,
  type PublicOAuthProvider,
} from "@/features/oauth-providers"

interface OAuthProvidersProps {
  providers?: PublicOAuthProvider[]
  coreBaseUrl?: string | null
  defaultWebUrl?: string | null
  interaction?: string | null
  redirect?: string | null
}

export function OAuthProviders({
  providers = [],
  coreBaseUrl,
  defaultWebUrl,
  interaction,
  redirect,
}: OAuthProvidersProps) {
  const [consoleOrigin, setConsoleOrigin] = useState<string>("")

  useEffect(() => {
    setConsoleOrigin(window.location.origin)
  }, [])

  if (providers.length === 0) {
    return null
  }

  const coreUrl = (coreBaseUrl?.trim() || getPublicCoreUrl()).replace(/\/+$/, "")

  const params = new URLSearchParams()
  if (interaction) {
    params.set("interaction", interaction)
  } else {
    // Route through /auth/callback so the console exchanges the ticket for session cookies
    const callbackTarget =
      redirect && redirect.startsWith("/") ? redirect : "/dashboard"
    const origin = (
      consoleOrigin ||
      defaultWebUrl?.trim() ||
      getConsoleUrl()
    ).replace(/\/+$/, "")
    const callbackUrl = `${origin}/auth/callback?redirect=${encodeURIComponent(callbackTarget)}`
    params.set("redirect", callbackUrl)
  }

  const queryString = params.toString() ? `?${params.toString()}` : ""

  return (
    <div
      className={`grid gap-2.5 ${
        providers.length === 1 ? "grid-cols-1" : "sm:grid-cols-2"
      }`}
    >
      {providers.map((provider) => {
        const authUrl = `${coreUrl}/auth/oauth/${encodeURIComponent(provider.code)}${queryString}`
        return (
          <Button
            key={provider.code}
            variant="outline"
            type="button"
            render={<a href={authUrl} />}
            className="font-mono text-xs gap-2"
          >
            <OAuthProviderIcon code={provider.code} className="size-4 shrink-0" />
            <span className="truncate">{provider.name}</span>
          </Button>
        )
      })}
    </div>
  )
}
