"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  RiLockPasswordLine,
  RiShieldFlashLine,
  RiCheckLine,
  RiCloseLine,
  RiEyeLine,
  RiEyeOffLine,
  RiLoader4Line,
} from "@remixicon/react"
import type { UserProfile } from "../types/account.types"
import { changeMyPasswordAction } from "../server/account-actions"
import { PasskeyManager } from "@/features/users/components/passkey-manager"

interface AccountSecurityTabProps {
  profile: UserProfile
}

export function AccountSecurityTab({ profile }: AccountSecurityTabProps) {
  // Password change state
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordFeedback(null)

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: "error",
        message: "New passwords do not match. Please re-enter.",
      })
      return
    }

    setLoadingPassword(true)
    const res = await changeMyPasswordAction(oldPassword, newPassword)
    setLoadingPassword(false)

    if (res.success) {
      setPasswordFeedback({
        type: "success",
        message: res.message || "Password changed successfully.",
      })
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } else {
      setPasswordFeedback({
        type: "error",
        message: res.message || "Failed to update password.",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Change Password Card */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <RiLockPasswordLine className="h-5 w-5 text-primary" />
            Change Password
          </CardTitle>
          <CardDescription>
            Ensure your account uses a strong, random password. Changing your password will
            terminate all other active sessions for your protection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-xl">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="oldPassword" className="text-xs font-mono text-muted-foreground">
                CURRENT PASSWORD
              </Label>
              <div className="relative">
                <Input
                  id="oldPassword"
                  type={showOld ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="bg-background border-border pr-10 font-mono text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showOld ? (
                    <RiEyeOffLine className="h-4 w-4" />
                  ) : (
                    <RiEyeLine className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-xs font-mono text-muted-foreground">
                NEW PASSWORD
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-background border-border pr-10 font-mono text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? (
                    <RiEyeOffLine className="h-4 w-4" />
                  ) : (
                    <RiEyeLine className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs font-mono text-muted-foreground">
                CONFIRM NEW PASSWORD
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-background border-border font-mono text-sm"
                required
              />
            </div>

            {/* Feedback alert */}
            {passwordFeedback && (
              <div
                className={`p-3 rounded-lg flex items-center gap-2 text-sm font-sans ${
                  passwordFeedback.type === "success"
                    ? "bg-green-500/10 text-green-500 border border-green-500/20"
                    : "bg-red-500/10 text-red-500 border border-red-500/20"
                }`}
              >
                {passwordFeedback.type === "success" ? (
                  <RiCheckLine className="h-4 w-4 shrink-0" />
                ) : (
                  <RiCloseLine className="h-4 w-4 shrink-0" />
                )}
                <span>{passwordFeedback.message}</span>
              </div>
            )}

            <Button type="submit" disabled={loadingPassword} className="gap-2">
              {loadingPassword && <RiLoader4Line className="h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Biometrics & WebAuthn Passkeys Card */}
      <PasskeyManager
        userId={profile.id}
        isAdminView={false}
        userEmail={profile.email}
      />

      {/* Two-Factor Authentication Status Card */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <RiShieldFlashLine className="h-5 w-5 text-primary" />
                Two-Factor Authentication (TOTP)
              </CardTitle>
              <CardDescription>
                Add an extra layer of security using Google Authenticator, Authy, or 1Password.
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={
                profile.mfaEnabled
                  ? "border-green-500/40 bg-green-500/10 text-green-500 font-mono text-xs"
                  : "border-border text-muted-foreground font-mono text-xs"
              }
            >
              {profile.mfaEnabled ? "ENABLED" : "DISABLED"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {profile.mfaEnabled
              ? "Two-factor authentication is active on your account. Authenticator OTP is required on login."
              : "Passkeys provide zero-phishing passwordless biometrics. You can also configure TOTP authenticator backup codes."}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
