"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RiCheckLine, RiGlobalLine, RiLoader4Line } from "@remixicon/react"
import {
  updateOidcSettingsAction,
  type OidcSettings,
} from "../server/oidc-actions"

interface OidcSettingsCardProps {
  initialSettings: OidcSettings
}

export function OidcSettingsCard({ initialSettings }: OidcSettingsCardProps) {
  const [issuer, setIssuer] = useState(initialSettings.issuer)
  const [consoleUrl, setConsoleUrl] = useState(initialSettings.consoleUrl)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    if (!issuer.trim() || !consoleUrl.trim()) {
      setFeedback({
        type: "error",
        message: "Both Issuer URL and Console Login URL are required.",
      })
      return
    }

    setSaving(true)
    const res = await updateOidcSettingsAction({
      issuer: issuer.trim(),
      consoleUrl: consoleUrl.trim(),
    })
    setSaving(false)

    if (res.success) {
      setFeedback({
        type: "success",
        message: "OIDC Issuer & Console URL updated immediately without restarting the server.",
      })
    } else {
      setFeedback({
        type: "error",
        message: res.message || "Failed to update OIDC settings",
      })
    }
  }

  return (
    <Card className="border border-border/50 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <RiGlobalLine className="size-4 text-primary" />
          <CardTitle className="font-heading text-base font-semibold">
            OIDC Domain & Issuer Settings
          </CardTitle>
        </div>
        <CardDescription className="font-mono text-xs">
          Switch between localhost, tunnel domains, or production domains without editing .env files or restarting the backend.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSave}
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end font-mono text-xs"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="oidc-issuer-url">OIDC Issuer URL</Label>
            <Input
              id="oidc-issuer-url"
              placeholder="https://auth.example.com/oidc"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="oidc-console-url">Console Login URL</Label>
            <Input
              id="oidc-console-url"
              placeholder="https://console.example.com"
              value={consoleUrl}
              onChange={(e) => setConsoleUrl(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={saving}
            className="font-mono"
          >
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
            {feedback.type === "success" && (
              <RiCheckLine className="size-3.5 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
