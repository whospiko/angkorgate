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
import { RiAddLine, RiLoader4Line } from "@remixicon/react"
import { createAppAction } from "../server/apps-actions"

export function CreateAppDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [appCode, setAppCode] = useState("")
  const [name, setName] = useState("")
  const [redirectUris, setRedirectUris] = useState("http://localhost:5173/callback")
  const [oauthEnabled, setOauthEnabled] = useState(true)
  const [passwordLoginEnabled, setPasswordLoginEnabled] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const urls = redirectUris
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean)

    const res = await createAppAction({
      appCode,
      name,
      oauthEnabled,
      enabledProviders: oauthEnabled ? ["google", "apple"] : [],
      passwordLoginEnabled,
      registrationEnabled: true,
      emailVerificationRequired: true,
      allowedRedirectUrls: urls.length > 0 ? urls : ["http://localhost:5173/callback"],
    })

    setLoading(false)
    if (res.success) {
      setOpen(false)
      setAppCode("")
      setName("")
    } else {
      setError(res.message || "Failed to create application")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="font-mono">
            <RiAddLine className="mr-1.5 size-4" /> Register App
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">Register Client Application</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Register a new OIDC client application in AngkorGate Core.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md my-2 border border-destructive/20">
              {error}
            </div>
          )}

          <div className="grid gap-4 py-4 font-mono text-xs">
            <div className="grid gap-2">
              <Label htmlFor="appCode">App Code (kebab-case)</Label>
              <Input
                id="appCode"
                placeholder="portal-client"
                value={appCode}
                onChange={(e) => setAppCode(e.target.value.toLowerCase())}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                placeholder="Enterprise Customer Portal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="redirectUrls">Redirect URIs (comma-separated)</Label>
              <Input
                id="redirectUrls"
                placeholder="https://app.example.com/callback, http://localhost:3000/callback"
                value={redirectUris}
                onChange={(e) => setRedirectUris(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <Label htmlFor="oauth-toggle" className="text-sm font-sans font-medium">OAuth Federation</Label>
                <p className="text-muted-foreground text-[11px]">Enable Google & Apple authentication</p>
              </div>
              <Switch
                id="oauth-toggle"
                checked={oauthEnabled}
                onCheckedChange={setOauthEnabled}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <Label htmlFor="password-toggle" className="text-sm font-sans font-medium">Password Authentication</Label>
                <p className="text-muted-foreground text-[11px]">Allow email/password credentials</p>
              </div>
              <Switch
                id="password-toggle"
                checked={passwordLoginEnabled}
                onCheckedChange={setPasswordLoginEnabled}
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
                "Create Application"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
