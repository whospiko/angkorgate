"use client"

import { useEffect, useState } from "react"
import { startAuthentication } from "@simplewebauthn/browser"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  RiEyeLine,
  RiEyeOffLine,
  RiFingerprintLine,
  RiKey2Line,
  RiLoader4Line,
  RiLockPasswordLine,
  RiMailSendLine,
  RiShieldCheckLine,
  RiShieldKeyholeLine,
} from "@remixicon/react"
import type { StepUpStatus } from "../types/step-up.types"
import {
  getStepUpPasskeyOptionsAction,
  getStepUpStatusAction,
  requestStepUpEmailOtpAction,
  verifyStepUpAction,
  verifyStepUpPasskeyAction,
} from "../server/step-up-actions"

type ActiveMethod = "passkey" | "password" | "totp" | "email_otp"

interface StepUpVerificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onVerified: () => void
  title?: string
  description?: string
}

function pickDefaultMethod(status: StepUpStatus): ActiveMethod {
  if (status.availableMethods.passkey) return "passkey"
  if (status.availableMethods.password) return "password"
  if (status.availableMethods.totp) return "totp"
  return "email_otp"
}

export function StepUpVerificationDialog({
  open,
  onOpenChange,
  onVerified,
  title = "Verify Identity to Reveal Secret",
  description = "Re-authenticate to view or copy sensitive keys. Verification stays active for 5 minutes.",
}: StepUpVerificationDialogProps) {
  const [status, setStatus] = useState<StepUpStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [activeMethod, setActiveMethod] = useState<ActiveMethod>("password")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState("")
  const [otpSentMessage, setOtpSentMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setPassword("")
      setCode("")
      setShowPassword(false)
      setOtpSentMessage(null)
      setError(null)
    }
    onOpenChange(nextOpen)
  }

  useEffect(() => {
    if (!open) return

    let active = true
    void Promise.resolve().then(async () => {
      if (!active) return
      setLoadingStatus(true)
      setError(null)
      const res = await getStepUpStatusAction()
      if (!active) return
      setLoadingStatus(false)
      if (!res.success || !res.data) {
        setError(res.message || "Unable to load verification methods.")
        return
      }
      if (res.data.verified) {
        onOpenChange(false)
        onVerified()
        return
      }
      setStatus(res.data)
      setActiveMethod(pickDefaultMethod(res.data))
    })

    return () => {
      active = false
    }
  }, [open, onOpenChange, onVerified])

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) {
      setError("Please enter your account password.")
      return
    }
    setSubmitting(true)
    setError(null)
    const res = await verifyStepUpAction({ method: "password", password })
    setSubmitting(false)

    if (res.success) {
      onOpenChange(false)
      onVerified()
    } else {
      setError(res.message || "Incorrect password.")
    }
  }

  const handleVerifyCode = async (
    e: React.FormEvent,
    method: "totp" | "email_otp"
  ) => {
    e.preventDefault()
    if (!code.trim()) {
      setError("Please enter the verification code.")
      return
    }
    setSubmitting(true)
    setError(null)
    const res = await verifyStepUpAction({ method, code: code.trim() })
    setSubmitting(false)

    if (res.success) {
      onOpenChange(false)
      onVerified()
    } else {
      setError(res.message || "Invalid verification code.")
    }
  }

  const handleSendEmailOtp = async () => {
    setSubmitting(true)
    setError(null)
    const res = await requestStepUpEmailOtpAction()
    setSubmitting(false)
    if (res.success) {
      setOtpSentMessage(
        res.message || "A 6-digit verification code was sent to your email."
      )
    } else {
      setError(res.message || "Failed to send verification code.")
    }
  }

  const handleVerifyPasskey = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const optRes = await getStepUpPasskeyOptionsAction()
      if (!optRes.success || !optRes.data) {
        setError(optRes.message || "Unable to initiate passkey challenge.")
        setSubmitting(false)
        return
      }
      const challengeId = String(optRes.data.challengeId || "")
      const assertion = await startAuthentication({
        optionsJSON: optRes.data as never,
      })
      const verifyRes = await verifyStepUpPasskeyAction(challengeId, assertion)
      if (verifyRes.success) {
        onOpenChange(false)
        onVerified()
      } else {
        setError(verifyRes.message || "Passkey verification failed.")
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Passkey prompt was cancelled or failed."
      )
    } finally {
      setSubmitting(false)
    }
  }

  const candidateMethods: Array<{
    id: ActiveMethod
    label: string
    available: boolean
  }> = status
    ? [
        {
          id: "passkey",
          label: "Passkey",
          available: status.availableMethods.passkey,
        },
        {
          id: "password",
          label: "Password",
          available: status.availableMethods.password,
        },
        {
          id: "totp",
          label: "Authenticator",
          available: status.availableMethods.totp,
        },
        {
          id: "email_otp",
          label: "Email Code",
          available: status.availableMethods.emailOtp,
        },
      ]
    : []
  const methods = candidateMethods.filter((m) => m.available)

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <RiShieldKeyholeLine className="size-5" />
            <DialogTitle className="font-heading text-base font-semibold text-foreground">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="font-mono text-xs text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        {loadingStatus ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
            <RiLoader4Line className="size-5 animate-spin text-primary" />
            <span>Checking security methods...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {status &&
              !status.availableMethods.password &&
              status.oauthProviders.length > 0 && (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 font-mono text-[11px] text-foreground/90">
                  Signed in via{" "}
                  <span className="font-semibold uppercase">
                    {status.oauthProviders.join(", ")}
                  </span>{" "}
                  with no local password. Verify using{" "}
                  {status.availableMethods.passkey
                    ? "your Passkey, Authenticator, or a 6-digit Email Code."
                    : "a 6-digit Email Code (or register a Passkey in /account for 1-tap Touch ID)."}
                </div>
              )}

            {methods.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {methods.map((m) => (
                  <Button
                    key={m.id}
                    type="button"
                    size="sm"
                    variant={activeMethod === m.id ? "default" : "outline"}
                    onClick={() => {
                      setActiveMethod(m.id)
                      setError(null)
                    }}
                    className="h-7 font-mono text-[11px]"
                  >
                    {m.label}
                  </Button>
                ))}
              </div>
            )}

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 font-mono text-xs text-destructive">
                {error}
              </div>
            )}

            {activeMethod === "passkey" && (
              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4 text-center">
                <RiFingerprintLine className="mx-auto size-8 text-primary" />
                <p className="font-mono text-xs text-muted-foreground">
                  Use Touch ID, Face ID, Windows Hello, or your security key to
                  unlock credentials.
                </p>
                <Button
                  type="button"
                  onClick={() => void handleVerifyPasskey()}
                  disabled={submitting}
                  className="w-full font-mono text-xs gap-2"
                >
                  {submitting ? (
                    <RiLoader4Line className="size-4 animate-spin" />
                  ) : (
                    <RiFingerprintLine className="size-4" />
                  )}
                  Verify with Passkey
                </Button>
              </div>
            )}

            {activeMethod === "password" && (
              <form onSubmit={handleVerifyPassword} className="space-y-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="stepup-password"
                    className="font-mono text-xs flex items-center gap-1.5"
                  >
                    <RiLockPasswordLine className="size-3.5 text-primary" />
                    Account Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="stepup-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="pr-10 font-mono text-xs"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <RiEyeOffLine className="size-4" />
                      ) : (
                        <RiEyeLine className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full font-mono text-xs gap-1.5"
                >
                  {submitting ? (
                    <RiLoader4Line className="size-4 animate-spin" />
                  ) : (
                    <RiShieldCheckLine className="size-4" />
                  )}
                  Verify & Reveal
                </Button>
              </form>
            )}

            {activeMethod === "totp" && (
              <form
                onSubmit={(e) => void handleVerifyCode(e, "totp")}
                className="space-y-3"
              >
                <div className="space-y-1.5">
                  <Label
                    htmlFor="stepup-totp"
                    className="font-mono text-xs flex items-center gap-1.5"
                  >
                    <RiKey2Line className="size-3.5 text-primary" />
                    Authenticator / Backup Code
                  </Label>
                  <Input
                    id="stepup-totp"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="123456"
                    className="font-mono text-sm tracking-widest"
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full font-mono text-xs gap-1.5"
                >
                  {submitting ? (
                    <RiLoader4Line className="size-4 animate-spin" />
                  ) : (
                    <RiShieldCheckLine className="size-4" />
                  )}
                  Verify Code
                </Button>
              </form>
            )}

            {activeMethod === "email_otp" && (
              <form
                onSubmit={(e) => void handleVerifyCode(e, "email_otp")}
                className="space-y-3"
              >
                <div className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/20 p-2.5">
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] text-foreground truncate">
                      {status?.email || "Account Email"}
                    </div>
                    <Badge variant="secondary" className="font-mono text-[10px] mt-0.5">
                      One-Time Verification
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => void handleSendEmailOtp()}
                    className="font-mono text-xs gap-1.5 shrink-0"
                  >
                    <RiMailSendLine className="size-3.5" />
                    Send Code
                  </Button>
                </div>

                {otpSentMessage && (
                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                    {otpSentMessage}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="stepup-email-otp" className="font-mono text-xs">
                    6-Digit Verification Code
                  </Label>
                  <Input
                    id="stepup-email-otp"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="font-mono text-sm tracking-widest"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full font-mono text-xs gap-1.5"
                >
                  {submitting ? (
                    <RiLoader4Line className="size-4 animate-spin" />
                  ) : (
                    <RiShieldCheckLine className="size-4" />
                  )}
                  Verify & Reveal
                </Button>
              </form>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
