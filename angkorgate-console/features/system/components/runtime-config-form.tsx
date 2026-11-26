"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  RiAlertLine,
  RiCheckDoubleLine,
  RiFingerprintLine,
  RiKey2Line,
  RiLoader4Line,
  RiMagicLine,
  RiMailSendLine,
  RiRestartLine,
  RiSaveLine,
  RiSendPlaneLine,
  RiServerLine,
  RiSmartphoneLine,
} from "@remixicon/react"
import type {
  RuntimeSettingCategory,
  RuntimeSettingView,
} from "../types/runtime-config.schemas"
import {
  revealRuntimeSecretAction,
  testMailConfigAction,
  testSmsConfigAction,
  updateRuntimeConfigAction,
} from "../server/runtime-config-actions"
import { SecretInputField } from "@/components/secret-field"

const CATEGORIES: {
  id: RuntimeSettingCategory
  label: string
  description: string
}[] = [
  {
    id: "mail",
    label: "Email / SMTP",
    description:
      "Configure SMTP delivery for Magic Links, Email OTPs, and verification emails.",
  },
  {
    id: "sms",
    label: "SMS Gateway",
    description:
      "Configure Twilio or a custom HTTP webhook for 6-digit SMS OTP delivery.",
  },
  {
    id: "passwordless",
    label: "Passwordless",
    description:
      "Control Magic Link & OTP expiration, cooldowns, and auto-registration.",
  },
  {
    id: "webauthn",
    label: "Passkeys",
    description:
      "Configure WebAuthn Relying Party domain and allowed origins.",
  },
  {
    id: "auth",
    label: "Session & JWT",
    description: "Adjust access and refresh token lifetimes.",
  },
  {
    id: "system",
    label: "System",
    description: "Control global maintenance mode and operational safeguards.",
  },
]

function CategoryIcon({ category }: { category: RuntimeSettingCategory }) {
  switch (category) {
    case "mail":
      return <RiMailSendLine className="size-4 text-primary" />
    case "sms":
      return <RiSmartphoneLine className="size-4 text-primary" />
    case "passwordless":
      return <RiMagicLine className="size-4 text-primary" />
    case "webauthn":
      return <RiFingerprintLine className="size-4 text-primary" />
    case "auth":
      return <RiKey2Line className="size-4 text-primary" />
    case "system":
      return <RiServerLine className="size-4 text-primary" />
  }
}

export function RuntimeConfigForm({
  initialSettings,
}: {
  initialSettings: RuntimeSettingView[]
}) {
  const [settings, setSettings] = useState<RuntimeSettingView[]>(initialSettings)
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const item of initialSettings) {
      map[item.key] = item.value
    }
    return map
  })
  const [activeTab, setActiveTab] = useState<RuntimeSettingCategory>("mail")
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const [testEmail, setTestEmail] = useState("")
  const [testingMail, setTestingMail] = useState(false)
  const [testPhone, setTestPhone] = useState("")
  const [testingSms, setTestingSms] = useState(false)

  const handleSaveCategory = async (category: RuntimeSettingCategory) => {
    setSaving(true)
    setFeedback(null)

    const items = settings.filter((s) => s.category === category)
    const payload: Record<string, string | number | boolean | null> = {}

    for (const item of items) {
      const val = drafts[item.key] ?? ""
      if (item.isSecret && (val === "" || val === "••••••••")) {
        continue
      }
      payload[item.key] = val
    }

    if (Object.keys(payload).length === 0) {
      setSaving(false)
      setFeedback({ type: "success", message: "No changes to save." })
      return
    }

    const res = await updateRuntimeConfigAction(payload)
    setSaving(false)

    if (!res.success || !res.settings) {
      setFeedback({
        type: "error",
        message: res.message || "Failed to update settings.",
      })
      return
    }

    setSettings(res.settings)
    const nextDrafts: Record<string, string> = {}
    for (const s of res.settings) {
      nextDrafts[s.key] = s.value
    }
    setDrafts(nextDrafts)
    setFeedback({
      type: "success",
      message: res.message || "Settings applied live.",
    })
  }

  const handleResetKey = async (key: string) => {
    setSaving(true)
    setFeedback(null)
    const res = await updateRuntimeConfigAction({ [key]: null })
    setSaving(false)
    if (!res.success || !res.settings) {
      setFeedback({
        type: "error",
        message: res.message || "Failed to reset setting.",
      })
      return
    }
    setSettings(res.settings)
    const nextDrafts: Record<string, string> = {}
    for (const s of res.settings) {
      nextDrafts[s.key] = s.value
    }
    setDrafts(nextDrafts)
    setFeedback({
      type: "success",
      message: `${key} reverted to .env / default.`,
    })
  }

  const handleTestMail = async (e: React.FormEvent) => {
    e.preventDefault()
    setTestingMail(true)
    setFeedback(null)
    const res = await testMailConfigAction(testEmail)
    setTestingMail(false)
    setFeedback({
      type: res.success ? "success" : "error",
      message: res.message,
    })
  }

  const handleTestSms = async (e: React.FormEvent) => {
    e.preventDefault()
    setTestingSms(true)
    setFeedback(null)
    const res = await testSmsConfigAction(testPhone)
    setTestingSms(false)
    setFeedback({
      type: res.success ? "success" : "error",
      message: res.message,
    })
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={
            feedback.type === "success"
              ? "flex items-start gap-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs font-mono text-emerald-700 dark:text-emerald-300"
              : "flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs font-mono text-destructive"
          }
        >
          {feedback.type === "success" ? (
            <RiCheckDoubleLine className="mt-0.5 size-4 shrink-0" />
          ) : (
            <RiAlertLine className="mt-0.5 size-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as RuntimeSettingCategory)}
      >
        <TabsList className="flex flex-wrap h-auto gap-1">
          {CATEGORIES.map((cat) => (
            <TabsTrigger
              key={cat.id}
              value={cat.id}
              className="gap-1.5 font-mono text-xs"
            >
              <CategoryIcon category={cat.id} />
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((cat) => {
          const items = settings.filter((s) => s.category === cat.id)
          return (
            <TabsContent key={cat.id} value={cat.id} className="space-y-4 mt-4">
              <Card className="border border-border/50 bg-card">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="font-heading text-lg font-semibold flex items-center gap-2">
                      <CategoryIcon category={cat.id} />
                      {cat.label}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs mt-1">
                      {cat.description}
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={saving}
                    onClick={() => handleSaveCategory(cat.id)}
                    className="font-mono text-xs gap-1.5 shrink-0"
                  >
                    {saving ? (
                      <RiLoader4Line className="size-3.5 animate-spin" />
                    ) : (
                      <RiSaveLine className="size-3.5" />
                    )}
                    Save {cat.label}
                  </Button>
                </CardHeader>

                <CardContent className="space-y-5">
                  {items.map((item) => {
                    const currentVal = drafts[item.key] ?? ""
                    return (
                      <div
                        key={item.key}
                        className="flex flex-col gap-2 rounded-lg border border-border/40 bg-muted/20 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={item.key}
                              className="font-mono text-xs font-semibold text-foreground"
                            >
                              {item.label}
                            </Label>
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px]"
                            >
                              {item.key}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                item.source === "database"
                                  ? "default"
                                  : "secondary"
                              }
                              className="font-mono text-[10px]"
                            >
                              {item.source === "database"
                                ? "DB Override"
                                : item.source === "env"
                                  ? ".env"
                                  : "Default"}
                            </Badge>
                            {item.source === "database" && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={saving}
                                onClick={() => handleResetKey(item.key)}
                                className="h-6 px-2 font-mono text-[10px] text-muted-foreground hover:text-foreground gap-1"
                              >
                                <RiRestartLine className="size-3" />
                                Reset
                              </Button>
                            )}
                          </div>
                        </div>

                        <p className="font-mono text-[11px] text-muted-foreground">
                          {item.description}
                        </p>

                        {item.inputType === "boolean" ? (
                          <div className="flex items-center gap-2 pt-1">
                            <Switch
                              id={item.key}
                              checked={currentVal === "true"}
                              onCheckedChange={(checked) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [item.key]: checked ? "true" : "false",
                                }))
                              }
                            />
                            <span className="font-mono text-xs text-muted-foreground">
                              {currentVal === "true" ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                        ) : item.inputType === "select" && item.options ? (
                          <select
                            id={item.key}
                            value={currentVal}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [item.key]: e.target.value,
                              }))
                            }
                            className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 font-mono text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            {item.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : item.isSecret || item.inputType === "password" ? (
                          <SecretInputField
                            id={item.key}
                            value={currentVal}
                            onChange={(nextVal) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [item.key]: nextVal,
                              }))
                            }
                            hasStoredSecret={item.hasSecret}
                            onRevealStored={() =>
                              revealRuntimeSecretAction(item.key)
                            }
                            placeholder={
                              item.isSecret && item.hasSecret
                                ? "•••••••• (leave unchanged to keep)"
                                : item.placeholder || item.defaultValue
                            }
                          />
                        ) : (
                          <Input
                            id={item.key}
                            type={
                              item.inputType === "number" ? "number" : "text"
                            }
                            value={currentVal}
                            placeholder={
                              item.placeholder || item.defaultValue
                            }
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [item.key]: e.target.value,
                              }))
                            }
                            className="font-mono text-sm"
                          />
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {cat.id === "mail" && (
                <Card className="border border-border/50 bg-card">
                  <CardHeader>
                    <CardTitle className="font-heading text-base font-semibold">
                      Test Live Email Delivery
                    </CardTitle>
                    <CardDescription className="font-mono text-xs">
                      Save your SMTP settings above, then send a test email to
                      verify connectivity.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={handleTestMail}
                      className="flex flex-col sm:flex-row gap-2"
                    >
                      <Input
                        type="email"
                        required
                        placeholder="you@yourdomain.com"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        className="font-mono text-sm flex-1"
                      />
                      <Button
                        type="submit"
                        variant="outline"
                        disabled={testingMail}
                        className="font-mono text-xs gap-1.5"
                      >
                        {testingMail ? (
                          <RiLoader4Line className="size-3.5 animate-spin" />
                        ) : (
                          <RiSendPlaneLine className="size-3.5" />
                        )}
                        Send Test Email
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {cat.id === "sms" && (
                <Card className="border border-border/50 bg-card">
                  <CardHeader>
                    <CardTitle className="font-heading text-base font-semibold">
                      Test Live SMS Delivery
                    </CardTitle>
                    <CardDescription className="font-mono text-xs">
                      Save your SMS gateway settings above, then dispatch a test
                      SMS.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={handleTestSms}
                      className="flex flex-col sm:flex-row gap-2"
                    >
                      <Input
                        type="tel"
                        required
                        placeholder="+85512345678"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        className="font-mono text-sm flex-1"
                      />
                      <Button
                        type="submit"
                        variant="outline"
                        disabled={testingSms}
                        className="font-mono text-xs gap-1.5"
                      >
                        {testingSms ? (
                          <RiLoader4Line className="size-3.5 animate-spin" />
                        ) : (
                          <RiSendPlaneLine className="size-3.5" />
                        )}
                        Send Test SMS
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
