"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  RiCheckLine,
  RiCodeSSlashLine,
  RiFileCopyLine,
  RiKey2Line,
  RiRefreshLine,
  RiShieldKeyholeLine,
} from "@remixicon/react"
import type { JwksResponse, OidcDiscoveryDoc } from "../types/oidc.types"

interface OidcDiscoveryInspectorProps {
  discovery: OidcDiscoveryDoc | null
  jwks: JwksResponse | null
  coreApiUrl: string
}

export function OidcDiscoveryInspector({
  discovery,
  jwks,
  coreApiUrl,
}: OidcDiscoveryInspectorProps) {
  const router = useRouter()
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null)
  const [refreshing, setRefreshing] = React.useState(false)
  const [rawTab, setRawTab] = React.useState<"none" | "discovery" | "jwks">(
    "none"
  )

  const discoveryUrl = `${coreApiUrl}/oidc/.well-known/openid-configuration`

  const copyValue = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }

  const handleRefresh = () => {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 450)
  }

  const endpoints = discovery
    ? [
        { label: "Issuer", value: discovery.issuer },
        {
          label: "Authorization Endpoint",
          value: discovery.authorization_endpoint,
        },
        { label: "Token Endpoint", value: discovery.token_endpoint },
        { label: "UserInfo Endpoint", value: discovery.userinfo_endpoint },
        { label: "JWKS URI", value: discovery.jwks_uri },
      ]
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              OpenID Discovery
            </h1>
            <Badge
              variant={discovery ? "outline" : "destructive"}
              className="font-mono text-xs gap-1.5"
            >
              <span
                className={`size-1.5 rounded-full inline-block ${
                  discovery ? "bg-emerald-500" : "bg-destructive"
                }`}
              />
              {discovery ? "Active" : "Unavailable"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            OIDC provider metadata, cryptographic signing keys (JWKS), and supported capabilities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void copyValue("discovery-url", discoveryUrl)}
            className="font-mono text-xs gap-1.5"
          >
            {copiedKey === "discovery-url" ? (
              <>
                <RiCheckLine className="size-3.5 text-emerald-500" />
                Copied URL
              </>
            ) : (
              <>
                <RiFileCopyLine className="size-3.5" />
                Copy Discovery URL
              </>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="font-mono text-xs gap-1.5"
          >
            <RiRefreshLine
              className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {!discovery ? (
        <Card className="border border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              OIDC Discovery Unavailable
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              Could not reach <code>{discoveryUrl}</code>.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {/* Endpoints Grid */}
          <Card className="border border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <RiShieldKeyholeLine className="size-5 text-primary" />
                Published OIDC Endpoints
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                Copy endpoints directly into your OAuth 2.0 / OIDC relying party configuration.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2.5 sm:grid-cols-2">
              {endpoints.map((ep) => (
                <div
                  key={ep.label}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {ep.label}
                    </div>
                    <div className="truncate font-mono text-xs font-semibold text-foreground">
                      {ep.value}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => void copyValue(ep.label, ep.value)}
                    aria-label={`Copy ${ep.label}`}
                    className="shrink-0"
                  >
                    {copiedKey === ep.label ? (
                      <RiCheckLine className="size-3.5 text-emerald-500" />
                    ) : (
                      <RiFileCopyLine className="size-3.5" />
                    )}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Capabilities & JWKS */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border border-border/50 bg-card">
              <CardHeader>
                <CardTitle className="font-heading text-base">
                  Capabilities & Algorithms
                </CardTitle>
                <CardDescription className="font-mono text-xs">
                  Scopes, response types, PKCE, and token auth methods
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 font-mono text-xs">
                <div>
                  <div className="text-[11px] text-muted-foreground mb-1.5">
                    Scopes Supported
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {discovery.scopes_supported?.map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-muted-foreground mb-1.5">
                    Response Types
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {discovery.response_types_supported?.map((r) => (
                      <Badge key={r} variant="outline" className="text-[10px]">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-muted-foreground mb-1.5">
                    Signing Algorithms & PKCE
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {discovery.id_token_signing_alg_values_supported?.map(
                      (alg) => (
                        <Badge key={alg} variant="outline" className="text-[10px]">
                          {alg}
                        </Badge>
                      )
                    )}
                    {discovery.code_challenge_methods_supported?.map((m) => (
                      <Badge key={m} variant="secondary" className="text-[10px]">
                        PKCE: {m}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-muted-foreground mb-1.5">
                    Claims Supported
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {discovery.claims_supported?.map((c) => (
                      <Badge key={c} variant="outline" className="text-[10px]">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/50 bg-card">
              <CardHeader>
                <CardTitle className="font-heading text-base flex items-center gap-2">
                  <RiKey2Line className="size-4 text-primary" />
                  JWKS Public Keys
                </CardTitle>
                <CardDescription className="font-mono text-xs truncate">
                  Published at {discovery.jwks_uri}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 font-mono text-xs">
                {jwks?.keys && jwks.keys.length > 0 ? (
                  jwks.keys.map((k, idx) => (
                    <div
                      key={k.kid || idx}
                      className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground truncate">
                          kid: {k.kid || "default"}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {k.kty} · {k.alg || "RS256"}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        use: {k.use || "sig"}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-muted-foreground">
                    No public keys published in JWKS.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Optional Collapsible Raw JSON */}
          <Card className="border border-border/50 bg-card">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="font-heading text-base flex items-center gap-2">
                    <RiCodeSSlashLine className="size-4 text-primary" />
                    Raw Metadata JSON
                  </CardTitle>
                  <CardDescription className="font-mono text-xs">
                    Inspect or copy raw OIDC Discovery or JWKS JSON payloads.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant={rawTab === "discovery" ? "default" : "ghost"}
                    size="sm"
                    onClick={() =>
                      setRawTab(rawTab === "discovery" ? "none" : "discovery")
                    }
                    className="font-mono text-xs"
                  >
                    Discovery JSON
                  </Button>
                  <Button
                    type="button"
                    variant={rawTab === "jwks" ? "default" : "ghost"}
                    size="sm"
                    onClick={() =>
                      setRawTab(rawTab === "jwks" ? "none" : "jwks")
                    }
                    className="font-mono text-xs"
                  >
                    JWKS JSON
                  </Button>
                </div>
              </div>
            </CardHeader>
            {rawTab !== "none" && (
              <CardContent>
                <pre className="max-h-96 overflow-auto rounded-lg border border-border/60 bg-muted/40 p-4 font-mono text-xs text-foreground">
                  {JSON.stringify(
                    rawTab === "discovery" ? discovery : jwks,
                    null,
                    2
                  )}
                </pre>
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
