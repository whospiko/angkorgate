"use client"

import { useState } from "react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  RiAlertLine,
  RiArrowLeftLine,
  RiCheckDoubleLine,
  RiKey2Line,
  RiLoader4Line,
  RiMagicLine,
  RiMailSendLine,
  RiSmartphoneLine,
} from "@remixicon/react"
import {
  requestMagicLinkAction,
  requestOtpAction,
  verifyOtpAction,
} from "../server/passwordless-actions"

export type PasswordlessMethod = "magic_link" | "email_otp" | "sms_otp"

interface PasswordlessLoginProps {
  redirectUrl?: string
  enabledMethods?: {
    magicLinkEnabled: boolean
    emailOtpEnabled: boolean
    smsOtpEnabled: boolean
  }
  onBackToPassword: () => void
}

export function PasswordlessLogin({
  redirectUrl = "/dashboard",
  enabledMethods = {
    magicLinkEnabled: true,
    emailOtpEnabled: true,
    smsOtpEnabled: true,
  },
  onBackToPassword,
}: PasswordlessLoginProps) {
  const initialMethod: PasswordlessMethod = enabledMethods.magicLinkEnabled
    ? "magic_link"
    : enabledMethods.emailOtpEnabled
      ? "email_otp"
      : "sms_otp"
  const [method, setMethod] = useState<PasswordlessMethod>(initialMethod)
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [step, setStep] = useState<"request" | "verify">("request")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const resetFlow = (nextMethod: PasswordlessMethod) => {
    setMethod(nextMethod)
    setStep("request")
    setCode("")
    setError(null)
    setStatusMessage(null)
  }

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setStatusMessage(null)

    if (method === "magic_link") {
      const res = await requestMagicLinkAction(email, redirectUrl)
      setLoading(false)
      if (!res.success) {
        setError(res.message)
        return
      }
      setStatusMessage(res.message)
      setStep("verify")
      return
    }

    const channel = method === "sms_otp" ? "sms" : "email"
    const res = await requestOtpAction({
      channel,
      email: channel === "email" ? email : undefined,
      phone: channel === "sms" ? phone : undefined,
    })
    setLoading(false)
    if (!res.success) {
      setError(res.message)
      return
    }
    setStatusMessage(res.message)
    setStep("verify")
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const channel = method === "sms_otp" ? "sms" : "email"
    const res = await verifyOtpAction(
      {
        channel,
        email: channel === "email" ? email : undefined,
        phone: channel === "sms" ? phone : undefined,
        code,
      },
      redirectUrl
    )

    if (res.success) {
      window.location.href = res.redirectUrl || redirectUrl || "/dashboard"
      return
    }

    setError(res.message || "Verification failed.")
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToPassword}
          className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RiArrowLeftLine className="size-3.5" />
          Back to password sign in
        </button>
      </div>

      {/* Method Selector */}
      <div className="flex gap-1.5 rounded-lg border border-border/60 bg-muted/40 p-1">
        {enabledMethods.magicLinkEnabled && (
          <button
            type="button"
            onClick={() => resetFlow("magic_link")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-[11px] transition-colors",
              method === "magic_link"
                ? "bg-background text-foreground shadow-xs font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <RiMagicLine className="size-3.5 text-primary" />
            Magic Link
          </button>
        )}
        {enabledMethods.emailOtpEnabled && (
          <button
            type="button"
            onClick={() => resetFlow("email_otp")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-[11px] transition-colors",
              method === "email_otp"
                ? "bg-background text-foreground shadow-xs font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <RiMailSendLine className="size-3.5 text-primary" />
            Email OTP
          </button>
        )}
        {enabledMethods.smsOtpEnabled && (
          <button
            type="button"
            onClick={() => resetFlow("sms_otp")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-[11px] transition-colors",
              method === "sms_otp"
                ? "bg-background text-foreground shadow-xs font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <RiSmartphoneLine className="size-3.5 text-primary" />
            SMS OTP
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs font-mono text-destructive shadow-xs">
          <RiAlertLine className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1 leading-relaxed">{error}</div>
        </div>
      )}

      {statusMessage && (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs font-mono text-emerald-700 dark:text-emerald-300 shadow-xs">
          <RiCheckDoubleLine className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1 leading-relaxed">{statusMessage}</div>
        </div>
      )}

      {step === "request" ? (
        <form onSubmit={handleRequest}>
          <FieldGroup>
            {method === "sms_otp" ? (
              <Field>
                <FieldLabel htmlFor="pwl-phone" className="font-mono text-xs">
                  Phone Number (E.164)
                </FieldLabel>
                <Input
                  id="pwl-phone"
                  type="tel"
                  placeholder="+85512345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={loading}
                  className="font-mono text-sm"
                />
                <FieldDescription className="font-mono text-[11px]">
                  We&apos;ll send a 6-digit one-time passcode via SMS.
                </FieldDescription>
              </Field>
            ) : (
              <Field>
                <FieldLabel htmlFor="pwl-email" className="font-mono text-xs">
                  Email Address
                </FieldLabel>
                <Input
                  id="pwl-email"
                  type="email"
                  placeholder="user@angkorgate.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="font-mono text-sm"
                />
                <FieldDescription className="font-mono text-[11px]">
                  {method === "magic_link"
                    ? "We'll email you a one-click signed sign-in link."
                    : "We'll email you a 6-digit one-time verification code."}
                </FieldDescription>
              </Field>
            )}

            <Button type="submit" disabled={loading} className="w-full font-mono">
              {loading ? (
                <>
                  <RiLoader4Line className="mr-2 size-4 animate-spin" />
                  Sending...
                </>
              ) : method === "magic_link" ? (
                "Send Magic Link"
              ) : (
                "Send 6-Digit Code"
              )}
            </Button>
          </FieldGroup>
        </form>
      ) : method === "magic_link" ? (
        <div className="space-y-4 rounded-lg border border-border/60 bg-muted/30 p-4 text-center">
          <RiMailSendLine className="mx-auto size-8 text-primary" />
          <div className="space-y-1">
            <h2 className="font-heading text-base font-semibold">
              Check your inbox
            </h2>
            <p className="font-mono text-xs text-muted-foreground">
              Click the one-time sign-in link sent to{" "}
              <span className="font-semibold text-foreground">{email}</span>.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setStep("request")}
            className="font-mono text-xs"
          >
            Use a different email or resend
          </Button>
        </div>
      ) : (
        <form onSubmit={handleVerifyOtp}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="pwl-otp" className="font-mono text-xs">
                6-Digit Verification Code
              </FieldLabel>
              <div className="relative">
                <RiKey2Line className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="pwl-otp"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  disabled={loading}
                  className="pl-9 font-mono text-base tracking-[0.35em]"
                />
              </div>
              <FieldDescription className="font-mono text-[11px]">
                Sent to {method === "sms_otp" ? phone : email}
              </FieldDescription>
            </Field>

            <Button type="submit" disabled={loading || code.length !== 6} className="w-full font-mono">
              {loading ? (
                <>
                  <RiLoader4Line className="mr-2 size-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Sign In"
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={loading}
              onClick={() => {
                setStep("request")
                setCode("")
                setError(null)
              }}
              className="w-full font-mono text-xs text-muted-foreground"
            >
              Resend code or change contact
            </Button>
          </FieldGroup>
        </form>
      )}
    </div>
  )
}
