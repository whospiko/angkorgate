"use client"

import * as React from "react"
import { useActionState } from "react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  RiShieldUserLine,
  RiPaletteLine,
  RiCheckDoubleLine,
  RiArrowRightLine,
  RiArrowLeftLine,
  RiUpload2Line,
  RiLinkM,
  RiEyeLine,
  RiEyeOffLine,
  RiLoader4Line,
  RiAlertLine,
  RiSparklingLine,
} from "@remixicon/react"
import { executeSetupAction } from "../server/system-actions"
import type { SetupActionResult } from "../types/branding.types"
import { BrandLogo } from "./brand-logo"

export function SetupWizard() {
  const [step, setStep] = React.useState<1 | 2 | 3>(1)
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

  // Form State
  const [adminEmail, setAdminEmail] = React.useState("")
  const [adminPassword, setAdminPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [adminName, setAdminName] = React.useState("")
  const [adminPhone, setAdminPhone] = React.useState("")

  // Content Management / Branding State
  const [appName, setAppName] = React.useState("AngkorGate")
  const [appDescription, setAppDescription] = React.useState("Enterprise Open-Source Identity & Access Management")
  const [logoUrl, setLogoUrl] = React.useState("")
  const [faviconUrl, setFaviconUrl] = React.useState("")
  const [organizationName, setOrganizationName] = React.useState("AngkorGate Community")
  const [supportEmail, setSupportEmail] = React.useState("")
  const [footerText, setFooterText] = React.useState("© 2026 AngkorGate Open Source")

  // Client validation errors for step 1 & 2
  const [clientErrors, setClientErrors] = React.useState<Record<string, string>>({})

  const [state, formAction, isPending] = useActionState(
    executeSetupAction,
    null as SetupActionResult | null
  )

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setClientErrors((prev) => ({ ...prev, logo: "Please select an image file (PNG, SVG, JPG, WebP)." }))
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setClientErrors((prev) => ({ ...prev, logo: "Logo file size must be less than 2MB." }))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoUrl(reader.result)
        setClientErrors((prev) => {
          const updated = { ...prev }
          delete updated.logo
          return updated
        })
      }
    }
    reader.readAsDataURL(file)
  }

  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {}
    if (!adminEmail.trim()) {
      errors.adminEmail = "Administrator email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim())) {
      errors.adminEmail = "Please enter a valid email address"
    }

    if (!adminPassword) {
      errors.adminPassword = "Password is required"
    } else if (adminPassword.length < 8) {
      errors.adminPassword = "Password must be at least 8 characters long"
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirm password is required"
    } else if (adminPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match"
    }

    setClientErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {}
    if (!appName.trim() || appName.trim().length < 2) {
      errors.appName = "Application name must be at least 2 characters long"
    }
    if (supportEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail.trim())) {
      errors.supportEmail = "Please enter a valid support email address"
    }
    setClientErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2)
    } else if (step === 2) {
      if (validateStep2()) setStep(3)
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-mono text-xs text-primary">
            <RiSparklingLine className="size-3.5" /> First-Time Installation Wizard
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            Welcome to {appName || "AngkorGate"}
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            Complete the initial onboarding to create the root administrator and configure branding.
          </p>
        </div>

        {/* Stepper Tabs */}
        <div className="grid grid-cols-3 gap-2 font-mono text-xs">
          <div
            className={cn(
              "flex items-center gap-2 rounded-md border p-3 transition-colors",
              step === 1
                ? "border-primary bg-primary/10 text-primary font-semibold"
                : step > 1
                ? "border-border/60 bg-muted/30 text-muted-foreground"
                : "border-border/40 text-muted-foreground/60"
            )}
          >
            <RiShieldUserLine className="size-4 shrink-0" />
            <span className="truncate">1. Admin Account</span>
          </div>

          <div
            className={cn(
              "flex items-center gap-2 rounded-md border p-3 transition-colors",
              step === 2
                ? "border-primary bg-primary/10 text-primary font-semibold"
                : step > 2
                ? "border-border/60 bg-muted/30 text-muted-foreground"
                : "border-border/40 text-muted-foreground/60"
            )}
          >
            <RiPaletteLine className="size-4 shrink-0" />
            <span className="truncate">2. Content & Brand</span>
          </div>

          <div
            className={cn(
              "flex items-center gap-2 rounded-md border p-3 transition-colors",
              step === 3
                ? "border-primary bg-primary/10 text-primary font-semibold"
                : "border-border/40 text-muted-foreground/60"
            )}
          >
            <RiCheckDoubleLine className="size-4 shrink-0" />
            <span className="truncate">3. Launch</span>
          </div>
        </div>

        {/* Form Container */}
        <Card className="border border-border/50 bg-card shadow-sm">
          <form action={formAction}>
            {/* Hidden fields passed on submission */}
            <input type="hidden" name="adminEmail" value={adminEmail} />
            <input type="hidden" name="adminPassword" value={adminPassword} />
            <input type="hidden" name="confirmPassword" value={confirmPassword} />
            <input type="hidden" name="adminName" value={adminName} />
            <input type="hidden" name="adminPhone" value={adminPhone} />
            <input type="hidden" name="appName" value={appName} />
            <input type="hidden" name="appDescription" value={appDescription} />
            <input type="hidden" name="logoUrl" value={logoUrl} />
            <input type="hidden" name="faviconUrl" value={faviconUrl} />
            <input type="hidden" name="organizationName" value={organizationName} />
            <input type="hidden" name="supportEmail" value={supportEmail} />
            <input type="hidden" name="footerText" value={footerText} />

            {/* Server Error Alert */}
            {state && !state.success && (
              <div className="m-6 mb-0 rounded-md border border-destructive/30 bg-destructive/10 p-4 font-mono text-xs text-destructive flex items-start gap-3">
                <RiAlertLine className="size-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{state.message}</p>
                  {state.errors && (
                    <ul className="mt-1 list-disc list-inside space-y-0.5 text-muted-foreground">
                      {Object.entries(state.errors).map(([key, msgs]) =>
                        msgs?.map((msg, i) => (
                          <li key={`${key}-${i}`}>
                            <span className="font-semibold text-destructive">{key}:</span> {msg}
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* STEP 1: Admin Credentials */}
            {step === 1 && (
              <div className="p-6 space-y-4">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="font-heading text-lg">Super Administrator Account</CardTitle>
                  <CardDescription className="font-mono text-xs">
                    This account will have permanent root permissions (ADMIN role) over the entire platform.
                  </CardDescription>
                </CardHeader>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="adminEmail" className="font-mono text-xs">
                      Administrator Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      placeholder="admin@yourdomain.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className={cn(clientErrors.adminEmail && "border-destructive")}
                    />
                    {clientErrors.adminEmail && (
                      <p className="font-mono text-xs text-destructive">{clientErrors.adminEmail}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="adminName" className="font-mono text-xs">
                        Full Display Name
                      </Label>
                      <Input
                        id="adminName"
                        type="text"
                        placeholder="e.g. System Administrator"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="adminPhone" className="font-mono text-xs">
                        Phone Number (Optional)
                      </Label>
                      <Input
                        id="adminPhone"
                        type="tel"
                        placeholder="+855 12 345 678"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="adminPassword" className="font-mono text-xs">
                        Master Password <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="adminPassword"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••••••"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          className={cn("pr-9", clientErrors.adminPassword && "border-destructive")}
                        />
                        <button
                          type="button"
                          className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <RiEyeOffLine className="size-4" /> : <RiEyeLine className="size-4" />}
                        </button>
                      </div>
                      {clientErrors.adminPassword && (
                        <p className="font-mono text-xs text-destructive">{clientErrors.adminPassword}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword" className="font-mono text-xs">
                        Confirm Password <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={cn("pr-9", clientErrors.confirmPassword && "border-destructive")}
                        />
                        <button
                          type="button"
                          className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <RiEyeOffLine className="size-4" /> : <RiEyeLine className="size-4" />}
                        </button>
                      </div>
                      {clientErrors.confirmPassword && (
                        <p className="font-mono text-xs text-destructive">{clientErrors.confirmPassword}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="button" onClick={handleNext} className="gap-2">
                    Next: Content & Branding <RiArrowRightLine className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Content Management & Branding */}
            {step === 2 && (
              <div className="p-6 space-y-4">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="font-heading text-lg">Content Management & Branding</CardTitle>
                  <CardDescription className="font-mono text-xs">
                    Customize your application name, branding logos, and organization appearance.
                  </CardDescription>
                </CardHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="appName" className="font-mono text-xs">
                        Application Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="appName"
                        type="text"
                        placeholder="e.g. AngkorGate"
                        value={appName}
                        onChange={(e) => setAppName(e.target.value)}
                        className={cn(clientErrors.appName && "border-destructive")}
                      />
                      {clientErrors.appName && (
                        <p className="font-mono text-xs text-destructive">{clientErrors.appName}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="orgName" className="font-mono text-xs">
                        Organization / Company
                      </Label>
                      <Input
                        id="orgName"
                        type="text"
                        placeholder="e.g. Acme Corporation"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="appDesc" className="font-mono text-xs">
                      Application Tagline / Subtitle
                    </Label>
                    <Input
                      id="appDesc"
                      type="text"
                      placeholder="e.g. Unified Identity & Access Gateway"
                      value={appDescription}
                      onChange={(e) => setAppDescription(e.target.value)}
                    />
                  </div>

                  {/* Logo Configuration with Live Preview */}
                  <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-mono text-xs font-semibold">Application Logo</Label>
                      <Badge variant="outline" className="font-mono text-xs">
                        SVG, PNG, WebP
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                      <div className="sm:col-span-2 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            placeholder="Paste image URL (https://...)"
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                            className="font-mono text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor="logo-file-upload"
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-1.5 font-mono text-xs hover:bg-muted/50 transition-colors"
                          >
                            <RiUpload2Line className="size-3.5" /> Upload Image File
                          </label>
                          <input
                            id="logo-file-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleLogoFileUpload}
                            className="hidden"
                          />
                          {logoUrl && (
                            <button
                              type="button"
                              onClick={() => setLogoUrl("")}
                              className="font-mono text-xs text-muted-foreground hover:text-destructive underline"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        {clientErrors.logo && (
                          <p className="font-mono text-xs text-destructive">{clientErrors.logo}</p>
                        )}
                      </div>

                      {/* Brand Logo Live Preview */}
                      <div className="flex flex-col items-center justify-center p-3 rounded-md border border-border/40 bg-card">
                        <span className="font-mono text-[10px] text-muted-foreground mb-1">Live Preview</span>
                        <div className="flex aspect-square size-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 overflow-hidden">
                          <BrandLogo
                            logoUrl={logoUrl}
                            alt="Logo Preview"
                            customClassName="size-8 object-contain"
                            onError={() => setClientErrors((p) => ({ ...p, logo: "Invalid image URL" }))}
                          />
                        </div>
                        <span className="font-heading text-xs font-semibold mt-1 truncate max-w-[120px]">
                          {appName || "AngkorGate"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="supportEmail" className="font-mono text-xs">
                        Support Contact Email
                      </Label>
                      <Input
                        id="supportEmail"
                        type="email"
                        placeholder="support@yourdomain.com"
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="footerText" className="font-mono text-xs">
                        Footer Copyright
                      </Label>
                      <Input
                        id="footerText"
                        type="text"
                        placeholder="© 2026 AngkorGate Open Source"
                        value={footerText}
                        onChange={(e) => setFooterText(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-2">
                    <RiArrowLeftLine className="size-4" /> Back
                  </Button>
                  <Button type="button" onClick={handleNext} className="gap-2">
                    Next: Review & Launch <RiArrowRightLine className="size-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Review & Launch */}
            {step === 3 && (
              <div className="p-6 space-y-4">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="font-heading text-lg">Review & Initialize AngkorGate</CardTitle>
                  <CardDescription className="font-mono text-xs">
                    Please review your settings. Once initialized, the setup endpoint will be permanently locked.
                  </CardDescription>
                </CardHeader>

                <div className="space-y-4 font-mono text-xs">
                  <div className="rounded-md border border-border/50 divide-y divide-border/40">
                    <div className="p-3 bg-muted/20 font-semibold text-foreground flex items-center justify-between">
                      <span>Administrator Summary</span>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-primary hover:underline text-[11px]"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="p-3 grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">Admin Email:</span>
                      <span className="col-span-2 font-semibold text-foreground">{adminEmail}</span>
                    </div>
                    <div className="p-3 grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">Display Name:</span>
                      <span className="col-span-2 text-foreground">{adminName || "(Default)"}</span>
                    </div>
                    <div className="p-3 grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">Role:</span>
                      <span className="col-span-2">
                        <Badge variant="outline" className="font-mono text-xs">ADMIN (Super Administrator)</Badge>
                      </span>
                    </div>
                  </div>

                  <div className="rounded-md border border-border/50 divide-y divide-border/40">
                    <div className="p-3 bg-muted/20 font-semibold text-foreground flex items-center justify-between">
                      <span>Content Management & Branding</span>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="text-primary hover:underline text-[11px]"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="p-3 grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">App Name:</span>
                      <span className="col-span-2 font-semibold text-foreground">{appName}</span>
                    </div>
                    <div className="p-3 grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">Logo Asset:</span>
                      <span className="col-span-2 text-foreground">
                        {logoUrl ? "Custom Logo Attached" : "Default AngkorGate Logo"}
                      </span>
                    </div>
                    <div className="p-3 grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">Organization:</span>
                      <span className="col-span-2 text-foreground">{organizationName || "None"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    disabled={isPending}
                    className="gap-2"
                  >
                    <RiArrowLeftLine className="size-4" /> Back
                  </Button>

                  <Button type="submit" disabled={isPending} className="gap-2">
                    {isPending ? (
                      <>
                        <RiLoader4Line className="size-4 animate-spin" />
                        Initializing Platform...
                      </>
                    ) : (
                      <>
                        <RiCheckDoubleLine className="size-4" />
                        Complete Setup & Launch
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Card>
      </div>
    </div>
  )
}
