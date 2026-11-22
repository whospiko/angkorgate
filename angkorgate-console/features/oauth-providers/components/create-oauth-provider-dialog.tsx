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
import { RiAddLine, RiLoader4Line } from "@remixicon/react"
import { createOAuthProviderAction } from "../server/oauth-providers-actions"

export function CreateOAuthProviderDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [code, setCode] = useState("google")
  const [name, setName] = useState("Google OAuth")
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [scopes, setScopes] = useState("openid email profile")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await createOAuthProviderAction({
      code: code.toLowerCase(),
      name,
      clientId,
      clientSecret,
      scopes,
      isActive: true,
    })

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
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">Add OAuth Identity Provider</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Configure OAuth credentials for Google, Apple, or custom OIDC providers.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md my-2 border border-destructive/20">
              {error}
            </div>
          )}

          <div className="grid gap-4 py-4 font-mono text-xs">
            <div className="grid gap-2">
              <Label htmlFor="provider-code">Provider Identifier (e.g. google, apple)</Label>
              <Input
                id="provider-code"
                placeholder="google"
                value={code}
                onChange={(e) => setCode(e.target.value.toLowerCase())}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="provider-name">Display Name</Label>
              <Input
                id="provider-name"
                placeholder="Google Workspace"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="provider-client-id">Client ID</Label>
              <Input
                id="provider-client-id"
                placeholder="apps.googleusercontent.com"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="provider-secret">Client Secret</Label>
              <Input
                id="provider-secret"
                type="password"
                placeholder="OAuth client secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="provider-scopes">Requested Scopes</Label>
              <Input
                id="provider-scopes"
                placeholder="openid email profile"
                value={scopes}
                onChange={(e) => setScopes(e.target.value)}
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
