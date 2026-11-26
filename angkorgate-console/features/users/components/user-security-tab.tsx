"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  RiLockPasswordLine,
  RiLockUnlockLine,
  RiCheckLine,
  RiCloseLine,
  RiShieldFlashLine,
  RiEyeLine,
  RiEyeOffLine,
  RiRefreshLine,
  RiDeleteBinLine,
  RiErrorWarningLine,
  RiTimeLine,
} from "@remixicon/react"
import type { User, UserSession } from "../types/users.types"
import {
  adminResetPasswordAction,
  unlockUserAction,
  toggleUserStatusAction,
  deleteUserAction,
} from "../server/users-actions"
import { PasskeyManager } from "./passkey-manager"
import { UserSessionsCard } from "./user-sessions-card"

interface UserSecurityTabProps {
  user: User
  sessions?: UserSession[]
}

export function UserSecurityTab({ user, sessions = [] }: UserSecurityTabProps) {
  const router = useRouter()

  // Reset password state
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [mustChangePassword, setMustChangePassword] = useState(true)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Account lock/unlock state
  const [unlocking, setUnlocking] = useState(false)
  const [lockFeedback, setLockFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Account status state
  const [statusLoading, setStatusLoading] = useState(false)
  const [currentActive, setCurrentActive] = useState(user.isActive)

  // Delete account state
  const [deleting, setDeleting] = useState(false)

  // Generate strong random password helper
  const generateStrongPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+"
    let generated = ""
    for (let i = 0; i < 16; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewPassword(generated)
    setShowPassword(true)
  }

  // Handle Admin Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 8) {
      setPasswordFeedback({ type: "error", text: "Password must be at least 8 characters long." })
      return
    }

    setResettingPassword(true)
    setPasswordFeedback(null)

    try {
      const res = await adminResetPasswordAction(user.id, {
        newPassword,
        mustChangePassword,
      })

      if (res.success) {
        setPasswordFeedback({
          type: "success",
          text: "Password reset successfully. The user will be required to change it on login if configured.",
        })
        setNewPassword("")
      } else {
        setPasswordFeedback({
          type: "error",
          text: res.message || "Failed to reset password.",
        })
      }
    } catch (err: any) {
      setPasswordFeedback({ type: "error", text: err.message || "An unexpected error occurred." })
    } finally {
      setResettingPassword(false)
    }
  }

  // Handle Account Unlock
  const handleUnlockAccount = async () => {
    setUnlocking(true)
    setLockFeedback(null)

    try {
      const res = await unlockUserAction(user.id)
      if (res.success) {
        setLockFeedback({
          type: "success",
          text: "User account successfully unlocked and failed attempt counter reset to 0.",
        })
      } else {
        setLockFeedback({
          type: "error",
          text: res.message || "Failed to unlock account.",
        })
      }
    } catch (err: any) {
      setLockFeedback({ type: "error", text: err.message || "An unexpected error occurred." })
    } finally {
      setUnlocking(false)
    }
  }

  // Handle Toggle Active/Deactivated
  const handleToggleStatus = async () => {
    setStatusLoading(true)
    try {
      const res = await toggleUserStatusAction(user.id, !currentActive)
      if (res.success) {
        setCurrentActive(!currentActive)
      }
    } finally {
      setStatusLoading(false)
    }
  }

  // Handle Account Deletion
  const handleDeleteUser = async () => {
    const promptEmail = user.email || user.id
    if (!confirm(`Are you absolutely sure you want to permanently delete user "${promptEmail}"? This action cannot be undone.`)) {
      return
    }

    setDeleting(true)
    try {
      const res = await deleteUserAction(user.id)
      if (res.success) {
        router.push("/users")
      } else {
        alert(res.message || "Failed to delete user account.")
      }
    } catch (err: any) {
      alert(err.message || "An error occurred during account deletion.")
    } finally {
      setDeleting(false)
    }
  }

  const failedAttempts = user.failedAttempts ?? user.failedLoginAttempts ?? 0
  const isLocked = Boolean(user.lockedUntil && new Date(user.lockedUntil) > new Date())

  return (
    <div className="grid gap-6">
      {/* Administrative Password Reset Card */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2">
            <RiLockPasswordLine className="size-5 text-primary" />
            <CardTitle className="font-heading text-base font-semibold">
              Administrative Password Reset
            </CardTitle>
          </div>
          <CardDescription className="text-xs font-mono">
            Provision a new temporary or permanent password for this user and optionally require a password change on next login.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4 max-w-xl">
            {passwordFeedback && (
              <div
                className={`p-3 rounded-md font-mono text-xs flex items-center gap-2 ${
                  passwordFeedback.type === "success"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : "bg-destructive/10 text-destructive border border-destructive/30"
                }`}
              >
                {passwordFeedback.type === "success" ? (
                  <RiCheckLine className="size-4 shrink-0" />
                ) : (
                  <RiCloseLine className="size-4 shrink-0" />
                )}
                <span>{passwordFeedback.text}</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="new-password" className="font-mono text-xs">
                  New Password
                </Label>
                <button
                  type="button"
                  onClick={generateStrongPassword}
                  className="font-mono text-[11px] text-primary hover:underline flex items-center gap-1"
                >
                  <RiRefreshLine className="size-3" />
                  Generate Strong Password
                </button>
              </div>

              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters..."
                  className="font-mono text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <RiEyeOffLine className="size-4" /> : <RiEyeLine className="size-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border/40">
              <div className="space-y-0.5">
                <Label htmlFor="enforce-change" className="font-mono text-xs font-medium cursor-pointer">
                  Require Password Change on Next Login
                </Label>
                <p className="font-mono text-[11px] text-muted-foreground">
                  The user will be prompted to choose a new password upon signing in.
                </p>
              </div>
              <Switch
                id="enforce-change"
                checked={mustChangePassword}
                onCheckedChange={setMustChangePassword}
              />
            </div>

            <Button type="submit" disabled={resettingPassword} className="gap-2 font-mono text-xs">
              <RiLockPasswordLine className="size-4" />
              <span>{resettingPassword ? "Resetting Password..." : "Apply Password Reset"}</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Lockout & Brute-Force Telemetry Card */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <RiLockUnlockLine className="size-5 text-primary" />
              <CardTitle className="font-heading text-base font-semibold">
                Account Lockout & Brute-Force Protection
              </CardTitle>
            </div>
            <Badge
              variant={isLocked ? "destructive" : "outline"}
              className="font-mono text-xs gap-1.5 w-fit"
            >
              {isLocked ? (
                <>
                  <RiErrorWarningLine className="size-3.5" />
                  Account Locked
                </>
              ) : (
                <>
                  <RiCheckLine className="size-3.5 text-emerald-500" />
                  Normal / Not Locked
                </>
              )}
            </Badge>
          </div>
          <CardDescription className="text-xs font-mono">
            View authentication failure attempts and unlock accounts locked by brute-force rate-limiting triggers.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {lockFeedback && (
            <div
              className={`p-3 rounded-md font-mono text-xs flex items-center gap-2 ${
                lockFeedback.type === "success"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : "bg-destructive/10 text-destructive border border-destructive/30"
              }`}
            >
              {lockFeedback.type === "success" ? (
                <RiCheckLine className="size-4 shrink-0" />
              ) : (
                <RiCloseLine className="size-4 shrink-0" />
              )}
              <span>{lockFeedback.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 rounded-md bg-muted/30 border border-border/40 space-y-1">
              <span className="text-muted-foreground text-[11px] block">Failed Login Attempts</span>
              <span className={`text-base font-bold ${failedAttempts > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                {failedAttempts} attempts
              </span>
            </div>

            <div className="p-3 rounded-md bg-muted/30 border border-border/40 space-y-1">
              <span className="text-muted-foreground text-[11px] block">Locked Until</span>
              <span className="text-foreground flex items-center gap-1 font-medium">
                <RiTimeLine className="size-3.5 text-muted-foreground" />
                {user.lockedUntil ? new Date(user.lockedUntil).toLocaleString() : "None (Unlocked)"}
              </span>
            </div>

            <div className="p-3 rounded-md bg-muted/30 border border-border/40 space-y-1">
              <span className="text-muted-foreground text-[11px] block">Security Status</span>
              <span className="text-foreground font-medium">
                {isLocked ? "Lockout Active" : "Clean State"}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleUnlockAccount}
              disabled={unlocking}
              variant="outline"
              className="gap-2 font-mono text-xs"
            >
              <RiLockUnlockLine className="size-4" />
              <span>{unlocking ? "Unlocking..." : "Reset Failed Attempts & Unlock"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Refresh Token Sessions */}
      <UserSessionsCard userId={user.id} initialSessions={sessions} />

      {/* Passkeys & FIDO2 Biometrics Manager */}
      <PasskeyManager userId={user.id} isAdminView={true} userEmail={user.email} />

      {/* Account Lifecycle & Activation State */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2">
            <RiShieldFlashLine className="size-5 text-primary" />
            <CardTitle className="font-heading text-base font-semibold">
              Account Activation State
            </CardTitle>
          </div>
          <CardDescription className="text-xs font-mono">
            Enable or temporarily disable access without deleting credentials or identity history.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border border-border/50 bg-muted/20">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-heading font-semibold text-sm">
                  {currentActive ? "Account is Active" : "Account is Deactivated"}
                </span>
                <Badge variant={currentActive ? "outline" : "secondary"} className="font-mono text-[10px]">
                  {currentActive ? "ENABLED" : "DISABLED"}
                </Badge>
              </div>
              <p className="font-mono text-xs text-muted-foreground max-w-lg">
                {currentActive
                  ? "User can authenticate and generate access tokens. Deactivating immediately invalidates token issuing."
                  : "User authentication requests will be blocked with a 401 Unauthorized status."}
              </p>
            </div>

            <Button
              variant={currentActive ? "outline" : "default"}
              size="sm"
              onClick={handleToggleStatus}
              disabled={statusLoading}
              className="font-mono text-xs shrink-0"
            >
              {currentActive ? "Deactivate Account" : "Activate Account"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone: Account Deletion */}
      <Card className="border-destructive/30 bg-destructive/5 shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <RiDeleteBinLine className="size-5" />
            <CardTitle className="font-heading text-base font-semibold">
              Danger Zone: Delete User Account
            </CardTitle>
          </div>
          <CardDescription className="text-xs font-mono text-destructive/80">
            Irrevocably delete this user identity, authentication credentials, and associated security tokens.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="font-mono text-xs text-muted-foreground max-w-xl">
              Deleting this account removes access immediately. If linked to an employee or customer record, those records may retain reference depending on database foreign key constraints.
            </p>

            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleting}
              className="gap-2 font-mono text-xs shrink-0"
            >
              <RiDeleteBinLine className="size-4" />
              <span>{deleting ? "Deleting Account..." : "Delete Account"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
