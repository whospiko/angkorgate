"use client"

import * as React from "react"
import { useActionState } from "react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  RiCommandLine,
  RiUpload2Line,
  RiCheckLine,
  RiAlertLine,
  RiLoader4Line,
  RiLayoutLine,
  RiSparklingLine,
} from "@remixicon/react"
import { updateBrandingAction } from "../server/system-actions"
import type { BrandingConfig, BrandingActionResult } from "../types/branding.types"
import { useBranding } from "./branding-provider"

export interface ContentManagementFormProps {
  initialBranding: BrandingConfig
}

export function ContentManagementForm({ initialBranding }: ContentManagementFormProps) {
  const { branding, updateBranding } = useBranding()

  const [appName, setAppName] = React.useState(branding.appName || initialBranding.appName || "AngkorGate")
  const [appDescription, setAppDescription] = React.useState(branding.appDescription || initialBranding.appDescription || "")
  const [logoUrl, setLogoUrl] = React.useState(branding.logoUrl || initialBranding.logoUrl || "")
  const [faviconUrl, setFaviconUrl] = React.useState(branding.faviconUrl || initialBranding.faviconUrl || "")
  const [organizationName, setOrganizationName] = React.useState(branding.organizationName || initialBranding.organizationName || "")
  const [supportEmail, setSupportEmail] = React.useState(branding.supportEmail || initialBranding.supportEmail || "")
  const [footerText, setFooterText] = React.useState(branding.footerText || initialBranding.footerText || "")

  const [state, formAction, isPending] = useActionState(
    async (prev: BrandingActionResult | null, formData: FormData) => {
      const res = await updateBrandingAction(prev, formData)
      if (res.success && res.data) {
        updateBranding(res.data)
      }
      return res
    },
    null
  )

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (PNG, SVG, JPG, WebP).")
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Logo file size must be less than 2MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Content Management & Branding
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            Configure application identity, logos, company details, and console appearance.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs gap-1.5 self-start sm:self-auto">
          <RiSparklingLine className="size-3 text-primary" /> Live Dynamic Theming
        </Badge>
      </div>

      {/* Grid: Preview Card + Form */}
      <div className="grid gap-6 md:grid-cols-7">
        {/* Form Column (4 cols) */}
        <div className="md:col-span-4">
          <Card className="border border-border/50">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Application Identity</CardTitle>
              <CardDescription className="font-mono text-xs">
                Update the visual branding elements displayed across console, login, and headers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={formAction} className="space-y-4">
                <input type="hidden" name="logoUrl" value={logoUrl} />
                <input type="hidden" name="faviconUrl" value={faviconUrl} />

                {state && (
                  <div
                    className={cn(
                      "rounded-md border p-3 font-mono text-xs flex items-center gap-2",
                      state.success
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-destructive/30 bg-destructive/10 text-destructive"
                    )}
                  >
                    {state.success ? (
                      <RiCheckLine className="size-4 shrink-0" />
                    ) : (
                      <RiAlertLine className="size-4 shrink-0" />
                    )}
                    <span>{state.message}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="appName" className="font-mono text-xs">
                    Application Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="appName"
                    name="appName"
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    required
                  />
                  {state?.errors?.appName && (
                    <p className="font-mono text-xs text-destructive">{state.errors.appName[0]}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="appDescription" className="font-mono text-xs">
                    Tagline / Subtitle
                  </Label>
                  <Input
                    id="appDescription"
                    name="appDescription"
                    type="text"
                    value={appDescription}
                    onChange={(e) => setAppDescription(e.target.value)}
                  />
                </div>

                {/* Logo Uploader / URL */}
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-mono text-xs font-semibold">Application Logo</Label>
                    <span className="font-mono text-[11px] text-muted-foreground">PNG, SVG, WebP (&lt; 2MB)</span>
                  </div>

                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="Paste image URL (https://...)"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="font-mono text-xs"
                    />

                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="content-logo-upload"
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-1.5 font-mono text-xs hover:bg-muted/50 transition-colors"
                      >
                        <RiUpload2Line className="size-3.5" /> Upload Image File
                      </label>
                      <input
                        id="content-logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      {logoUrl && (
                        <button
                          type="button"
                          onClick={() => setLogoUrl("")}
                          className="font-mono text-xs text-muted-foreground hover:text-destructive underline"
                        >
                          Remove Logo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="organizationName" className="font-mono text-xs">
                      Organization Name
                    </Label>
                    <Input
                      id="organizationName"
                      name="organizationName"
                      type="text"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="supportEmail" className="font-mono text-xs">
                      Support Email
                    </Label>
                    <Input
                      id="supportEmail"
                      name="supportEmail"
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="footerText" className="font-mono text-xs">
                    Footer Copyright / Notice
                  </Label>
                  <Input
                    id="footerText"
                    name="footerText"
                    type="text"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" disabled={isPending} className="gap-2">
                    {isPending ? (
                      <>
                        <RiLoader4Line className="size-4 animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <RiCheckLine className="size-4" />
                        Save Branding Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview Column (3 cols) */}
        <div className="md:col-span-3 space-y-6">
          <Card className="border border-border/50">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Live Brand Preview</CardTitle>
              <CardDescription className="font-mono text-xs">
                Real-time preview of how your brand renders across the console.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sidebar Header Preview */}
              <div className="rounded-md border border-border/60 bg-sidebar p-3 space-y-1">
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider block">
                  Sidebar Brand Header
                </span>
                <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-card p-2">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs overflow-hidden">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="Logo" className="size-5 object-contain" />
                    ) : (
                      <RiCommandLine className="size-4" />
                    )}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold tracking-wide font-heading">
                      {appName || "AngkorGate"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      Admin Console
                    </span>
                  </div>
                </div>
              </div>

              {/* Login Card Preview */}
              <div className="rounded-md border border-border/60 bg-muted/20 p-4 text-center space-y-2">
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider block">
                  Login Screen Preview
                </span>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm overflow-hidden">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="Logo" className="size-6 object-contain" />
                    ) : (
                      <RiCommandLine className="size-6" />
                    )}
                  </div>
                  <h3 className="font-heading text-base font-bold text-foreground">
                    Welcome to {appName || "AngkorGate"}
                  </h3>
                  <p className="font-mono text-xs text-muted-foreground">
                    {appDescription || "Enter your credentials to access the console"}
                  </p>
                </div>
              </div>

              {/* Footer Preview */}
              <div className="p-2 border-t border-border/40 font-mono text-[11px] text-muted-foreground text-center">
                {footerText || "© 2026 AngkorGate Open Source"}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
