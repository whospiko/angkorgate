"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RiAddLine, RiCheckLine, RiFileCopyLine, RiLoader4Line } from "@remixicon/react"
import { getPublicCoreUrl } from "@/lib/env"
import {
  CreateOAuthProviderSchema,
  OAUTH_PROVIDER_PRESETS,
  type OAuthProviderCode,
} from "../types/oauth-providers.types"
import { createOAuthProviderAction } from "../server/oauth-providers-actions"
import { OAuthProviderIcon } from "./provider-icon"

const SELECTABLE_PROVIDERS: OAuthProviderCode[] = [
  "google",
  "github",
  "discord",
  "microsoft",
  "telegram",
]

interface CreateOAuthProviderDialogProps {
  callbackBaseUrl?: string | null
}

export function CreateOAuthProviderDialog({
  callbackBaseUrl,
}: CreateOAuthProviderDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState(false)

  const [code, setCode] = useState<OAuthProviderCode>("github")
  const [name, setName] = useState(OAUTH_PROVIDER_PRESETS.github.name)
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [scopes, setScopes] = useState(OAUTH_PROVIDER_PRESETS.github.defaultScopes)
  const [tenantId, setTenantId] = useState("common")
  const [customCallbackUrl, setCustomCallbackUrl] = useState("")
  const [isActive, setIsActive] = useState(true)

  const preset = OAUTH_PROVIDER_PRESETS[code]
  const coreUrl = callbackBaseUrl?.trim() || getPublicCoreUrl()
  const defaultCallbackUrl = `${coreUrl.replace(/\/+$/, "")}/auth/oauth/${code}/callback`
  const effectiveCallbackUrl = customCallbackUrl.trim() || defaultCallbackUrl

  const handleSelectProvider = (nextCode: OAuthProviderCode) => {
    const nextPreset = OAUTH_PROVIDER_PRESETS[nextCode]
    setCode(nextCode)
    setName(nextPreset.name)
    setScopes(nextPreset.defaultScopes)
    setError(null)
  }

  const handleCopyCallback = () => {
    navigator.clipboard.writeText(effectiveCallbackUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 1800)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanedClientId = clientId.trim().replace(/^@+/, "")
    const extraConfig: Record<string, unknown> = {}
    if (customCallbackUrl.trim()) {
      extraConfig.callbackUrl = customCallbackUrl.trim()
    }
    if (code === "microsoft" && tenantId.trim()) {
      extraConfig.tenantId = tenantId.trim()
    }
    if (code === "telegram" && cleanedClientId) {
      extraConfig.botUsername = cleanedClientId
    }

    const parsed = CreateOAuthProviderSchema.safeParse({
      code,
      name: name.trim(),
      clientId: cleanedClientId,
      clientSecret: clientSecret.trim() || undefined,
      scopes: scopes.trim(),
      isActive,
      extraConfig: Object.keys(extraConfig).length > 0 ? extraConfig : undefined,
    })

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Invalid provider configuration")
      return
    }

    setLoading(true)
    const res = await createOAuthProviderAction(parsed.data)
    setLoading(false)

    if (res.success) {
      setOpen(false)
      setClientId("")
      setClientSecret("")
    } else {
      setError(res.message || "Failed to create OAuth provider")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="font-mono">
            <RiAddLine className="mr-1.5 size-4" /> Add Provider
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">
              Add Social Identity Provider
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Plug in a social identity provider. Changes take effect immediately without restarting the backend.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md my-2 border border-destructive/20">
              {error}
            </div>
          )}

          <div className="grid gap-4 py-4 font-mono text-xs">
            <div className="grid gap-2">
              <Label>Provider</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SELECTABLE_PROVIDERS.map((pCode) => {
                  const p = OAUTH_PROVIDER_PRESETS[pCode]
                  const selected = code === pCode
                  return (
                    <button
                      key={pCode}
                      type="button"
                      onClick={() => handleSelectProvider(pCode)}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors ${
                        selected
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/60 bg-card hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      <OAuthProviderIcon code={pCode} className="size-4 shrink-0" />
                      <span className="truncate font-medium">{p.shortName}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-muted-foreground font-sans">
                {preset.description}
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="provider-callback-url">
                Authorized Callback URL (optional override)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="provider-callback-url"
                  placeholder={defaultCallbackUrl}
                  value={customCallbackUrl}
                  onChange={(e) => setCustomCallbackUrl(e.target.value)}
                  className="text-[11px]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 shrink-0"
                  onClick={handleCopyCallback}
                  title="Copy callback URL"
                >
                  {copiedUrl ? (
                    <RiCheckLine className="size-4 text-emerald-500" />
                  ) : (
                    <RiFileCopyLine className="size-4" />
                  )}
                </Button>
              </div>
              {code === "telegram" && (
                <p className="text-[11px] text-muted-foreground font-sans">
                  Register your AngkorGate domain with BotFather using <code>/setdomain</code> before enabling Telegram login.
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="provider-name">Display Name</Label>
              <Input
                id="provider-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="provider-client-id">{preset.clientIdLabel}</Label>
              <Input
                id="provider-client-id"
                placeholder={preset.clientIdPlaceholder}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="provider-secret">{preset.clientSecretLabel}</Label>
              <Input
                id="provider-secret"
                type="password"
                placeholder={preset.clientSecretPlaceholder}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                required={preset.requiresSecret}
              />
            </div>

            {code === "microsoft" && (
              <div className="grid gap-2">
                <Label htmlFor="microsoft-tenant">Entra ID Tenant</Label>
                <Input
                  id="microsoft-tenant"
                  placeholder="common (or organizations, consumers, or tenant UUID)"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                />
              </div>
            )}

            {code !== "telegram" && (
              <div className="grid gap-2">
                <Label htmlFor="provider-scopes">Requested Scopes</Label>
                <Input
                  id="provider-scopes"
                  placeholder={preset.defaultScopes}
                  value={scopes}
                  onChange={(e) => setScopes(e.target.value)}
                />
              </div>
            )}

            <div className="flex items-center justify-between rounded-md border border-border/50 p-3">
              <div>
                <Label htmlFor="provider-active" className="text-xs font-medium">
                  Enable Provider Immediately
                </Label>
                <p className="text-[11px] text-muted-foreground font-sans">
                  Expose this provider on the login screen right away.
                </p>
              </div>
              <Switch
                id="provider-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? (
                <>
                  <RiLoader4Line className="mr-1.5 size-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Provider"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
