"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { RiCheckLine, RiGlobalLine, RiLoader4Line } from "@remixicon/react"
import {
  UpdateOAuthSettingsSchema,
  type GlobalOAuthSettings,
} from "../types/oauth-providers.types"
import { updateOAuthSettingsAction } from "../server/oauth-providers-actions"

interface OAuthSettingsCardProps {
  initialSettings: GlobalOAuthSettings
}

export function OAuthSettingsCard({ initialSettings }: OAuthSettingsCardProps) {
  const [oauthEnabled, setOauthEnabled] = useState(initialSettings.oauthEnabled)
  const [callbackBaseUrl, setCallbackBaseUrl] = useState(
    initialSettings.callbackBaseUrl ?? ""
  )
  const [webUrl, setWebUrl] = useState(initialSettings.webUrl ?? "")
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const handleToggleGlobal = async (next: boolean) => {
    setOauthEnabled(next)
    setToggling(true)
    setFeedback(null)
    const res = await updateOAuthSettingsAction({ oauthEnabled: next })
    setToggling(false)
    if (!res.success) {
      setOauthEnabled(!next)
      setFeedback({
        type: "error",
        message: res.message || "Failed to update global OAuth toggle",
      })
    } else {
      setFeedback({
        type: "success",
        message: next
          ? "OAuth federation enabled globally."
          : "OAuth federation disabled globally.",
      })
    }
  }

  const handleSaveUrls = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    const parsed = UpdateOAuthSettingsSchema.safeParse({
      oauthEnabled,
      callbackBaseUrl: callbackBaseUrl.trim(),
      ...(webUrl.trim() ? { webUrl: webUrl.trim() } : {}),
    })
    if (!parsed.success) {
      setFeedback({
        type: "error",
        message: parsed.error.issues[0]?.message || "Invalid settings",
      })
      return
    }

    setSaving(true)
    const res = await updateOAuthSettingsAction(parsed.data)
    setSaving(false)

    if (res.success) {
      setFeedback({
        type: "success",
        message: "OAuth URLs saved and applied immediately.",
      })
    } else {
      setFeedback({
        type: "error",
        message: res.message || "Failed to save OAuth settings",
      })
    }
  }

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <RiGlobalLine className="size-4 text-primary" />
              <CardTitle className="font-heading text-base font-semibold">
                Global Federation Settings
              </CardTitle>
              <Badge
                variant={oauthEnabled ? "outline" : "secondary"}
                className="font-mono text-[11px] gap-1"
              >
                <span
                  className={`size-1.5 rounded-full inline-block ${
                    oauthEnabled ? "bg-emerald-500" : "bg-muted-foreground"
                  }`}
                />
                {oauthEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <CardDescription className="font-mono text-xs">
              Control social login availability and callback URLs directly from the console without editing .env files or restarting the server.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Label htmlFor="global-oauth-switch" className="font-mono text-xs text-muted-foreground">
              Master Switch
            </Label>
            <Switch
              id="global-oauth-switch"
              checked={oauthEnabled}
              disabled={toggling}
              onCheckedChange={handleToggleGlobal}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSaveUrls} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end font-mono text-xs">
          <div className="grid gap-1.5">
            <Label htmlFor="oauth-callback-base">
              Backend Callback Base URL
            </Label>
            <Input
              id="oauth-callback-base"
              placeholder="Auto-detect from request host (e.g. http://localhost:8080)"
              value={callbackBaseUrl}
              onChange={(e) => setCallbackBaseUrl(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="oauth-web-url">
              Console / Default Redirect URL
            </Label>
            <Input
              id="oauth-web-url"
              placeholder="http://localhost:4000"
              value={webUrl}
              onChange={(e) => setWebUrl(e.target.value)}
            />
          </div>

          <Button type="submit" size="sm" variant="outline" disabled={saving} className="font-mono">
            {saving ? (
              <>
                <RiLoader4Line className="mr-1.5 size-3.5 animate-spin" /> Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </form>

        {feedback && (
          <div
            className={`mt-3 flex items-center gap-1.5 rounded-md border p-2 font-mono text-xs ${
              feedback.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {feedback.type === "success" && <RiCheckLine className="size-3.5 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
