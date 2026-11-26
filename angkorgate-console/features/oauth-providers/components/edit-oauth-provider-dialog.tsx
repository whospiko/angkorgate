"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RiCheckLine, RiFileCopyLine, RiLoader4Line } from "@remixicon/react"
import { getPublicCoreUrl } from "@/lib/env"
import {
  OAUTH_PROVIDER_PRESETS,
  UpdateOAuthProviderSchema,
  type OAuthProvider,
  type OAuthProviderCode,
} from "../types/oauth-providers.types"
import {
  revealOAuthProviderSecretAction,
  updateOAuthProviderAction,
} from "../server/oauth-providers-actions"
import { OAuthProviderIcon } from "./provider-icon"
import { SecretInputField } from "@/components/secret-field"

interface EditOAuthProviderDialogProps {
  provider: OAuthProvider
  callbackBaseUrl?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditOAuthProviderDialog({
  provider,
  callbackBaseUrl,
  open,
  onOpenChange,
}: EditOAuthProviderDialogProps) {
  const code = provider.code.toLowerCase() as OAuthProviderCode
  const preset = OAUTH_PROVIDER_PRESETS[code]

  const defaultBaseUrl = callbackBaseUrl?.trim() || getPublicCoreUrl()
  const defaultCallbackUrl = `${defaultBaseUrl.replace(/\/+$/, "")}/auth/oauth/${code}/callback`

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [name, setName] = useState(provider.name)
  const [clientId, setClientId] = useState(provider.clientId)
  const [clientSecret, setClientSecret] = useState("")
  const [callbackUrl, setCallbackUrl] = useState(
    typeof provider.extraConfig?.callbackUrl === "string"
      ? provider.extraConfig.callbackUrl
      : ""
  )
  const [scopes, setScopes] = useState(
    provider.scopes ?? preset?.defaultScopes ?? ""
  )
  const [tenantId, setTenantId] = useState(
    typeof provider.extraConfig?.tenantId === "string"
      ? provider.extraConfig.tenantId
      : "common"
  )
  const [isActive, setIsActive] = useState(provider.isActive)

  const effectiveCallbackUrl = callbackUrl.trim() || defaultCallbackUrl

  const handleCopyCallback = () => {
    navigator.clipboard.writeText(effectiveCallbackUrl)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 1800)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanedClientId = clientId.trim().replace(/^@+/, "")
    const nextExtraConfig: Record<string, unknown> = {
      ...(provider.extraConfig ?? {}),
    }

    if (callbackUrl.trim()) {
      nextExtraConfig.callbackUrl = callbackUrl.trim()
    } else {
      delete nextExtraConfig.callbackUrl
    }

    if (code === "microsoft") {
      nextExtraConfig.tenantId = tenantId.trim() || "common"
    }
    if (code === "telegram" && cleanedClientId) {
      nextExtraConfig.botUsername = cleanedClientId
    }

    const trimmedSecret = clientSecret.trim()
    const payload = {
      name: name.trim(),
      clientId: cleanedClientId,
      ...(trimmedSecret && trimmedSecret !== "••••••••"
        ? { clientSecret: trimmedSecret }
        : {}),
      scopes: scopes.trim(),
      isActive,
      extraConfig: nextExtraConfig,
    }

    const parsed = UpdateOAuthProviderSchema.safeParse(payload)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Invalid provider update")
      return
    }

    setLoading(true)
    const res = await updateOAuthProviderAction(provider.code, parsed.data)
    setLoading(false)

    if (res.success) {
      setClientSecret("")
      onOpenChange(false)
    } else {
      setError(res.message || "Failed to update OAuth provider")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-heading text-lg flex items-center gap-2">
              <OAuthProviderIcon code={provider.code} className="size-5" />
              Edit {provider.name}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Update credentials, redirect URL, or scopes for <code className="text-primary">{provider.code}</code>. Passport strategies hot-reload immediately.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md my-2 border border-destructive/20">
              {error}
            </div>
          )}

          <div className="grid gap-4 py-4 font-mono text-xs">
            <div className="grid gap-2">
              <Label htmlFor={`edit-name-${provider.code}`}>Display Name</Label>
              <Input
                id={`edit-name-${provider.code}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={`edit-callback-${provider.code}`}>
                Redirect / Callback URL Override
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`edit-callback-${provider.code}`}
                  placeholder={defaultCallbackUrl}
                  value={callbackUrl}
                  onChange={(e) => setCallbackUrl(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 shrink-0"
                  onClick={handleCopyCallback}
                  title="Copy effective callback URL"
                >
                  {copiedUrl ? (
                    <RiCheckLine className="size-4 text-emerald-500" />
                  ) : (
                    <RiFileCopyLine className="size-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground font-sans">
                Leave blank to use the global base URL ({defaultCallbackUrl}). Useful for ngrok/tunnel URLs.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`edit-cid-${provider.code}`}>
                {preset?.clientIdLabel ?? "Client ID"}
              </Label>
              <Input
                id={`edit-cid-${provider.code}`}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`edit-secret-${provider.code}`}>
                {preset?.clientSecretLabel ?? "Client Secret"}
              </Label>
              <SecretInputField
                id={`edit-secret-${provider.code}`}
                placeholder={
                  provider.hasClientSecret || provider.clientSecret
                    ? "•••••••• (leave blank to keep existing secret)"
                    : "Enter client secret"
                }
                value={clientSecret}
                onChange={setClientSecret}
                hasStoredSecret={Boolean(
                  provider.hasClientSecret ?? provider.clientSecret
                )}
                onRevealStored={async () => {
                  const res = await revealOAuthProviderSecretAction(
                    provider.code
                  )
                  return {
                    success: res.success,
                    value: res.clientSecret,
                    stepUpRequired: res.stepUpRequired,
                    message: res.message,
                  }
                }}
              />
            </div>

            {code === "microsoft" && (
              <div className="grid gap-2">
                <Label htmlFor={`edit-tenant-${provider.code}`}>
                  Entra ID Tenant
                </Label>
                <Input
                  id={`edit-tenant-${provider.code}`}
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                />
              </div>
            )}

            {code !== "telegram" && (
              <div className="grid gap-2">
                <Label htmlFor={`edit-scopes-${provider.code}`}>
                  Requested Scopes
                </Label>
                <Input
                  id={`edit-scopes-${provider.code}`}
                  value={scopes}
                  onChange={(e) => setScopes(e.target.value)}
                />
              </div>
            )}

            <div className="flex items-center justify-between rounded-md border border-border/50 p-3">
              <div>
                <Label htmlFor={`edit-active-${provider.code}`} className="text-xs font-medium">
                  Provider Enabled
                </Label>
                <p className="text-[11px] text-muted-foreground font-sans">
                  Allow authentication through this provider.
                </p>
              </div>
              <Switch
                id={`edit-active-${provider.code}`}
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
              onClick={() => onOpenChange(false)}
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
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
