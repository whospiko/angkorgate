"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  RiUserLine,
  RiBuildingLine,
  RiUserSharedLine,
  RiCheckLine,
  RiCloseLine,
  RiSaveLine,
  RiExternalLinkLine,
  RiInformationLine,
  RiShieldCheckLine,
  RiLinksLine,
  RiDeleteBinLine,
  RiLockPasswordLine,
} from "@remixicon/react"
import { OAuthProviderIcon } from "@/components/oauth-provider-icon"
import type { User, LinkedAccount, LinkedSocialAccount } from "../types/users.types"
import { updateUserAction, adminUnlinkUserOAuthAction } from "../server/users-actions"

interface UserInfoTabProps {
  user: User
  linkedAccount: LinkedAccount
  oauthAccounts?: LinkedSocialAccount[]
}

export function UserInfoTab({
  user,
  linkedAccount,
  oauthAccounts = [],
}: UserInfoTabProps) {
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null)
  const [unlinkFeedback, setUnlinkFeedback] = useState<string | null>(null)
  const [email, setEmail] = useState(user.email || "")
  const [phone, setPhone] = useState(user.phone || user.phoneNumber || "")
  const [isActive, setIsActive] = useState(user.isActive)
  const [isEmailVerified, setIsEmailVerified] = useState(user.isEmailVerified)
  const [isPhoneVerified, setIsPhoneVerified] = useState(Boolean(user.isPhoneVerified))
  const [mustChangePassword, setMustChangePassword] = useState(Boolean(user.mustChangePassword))

  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)

    try {
      const res = await updateUserAction(user.id, {
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        isActive,
        isEmailVerified,
        isPhoneVerified,
        mustChangePassword,
      })

      if (res.success) {
        setFeedback({ type: "success", text: "User information updated successfully." })
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to update user." })
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "An unexpected error occurred." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6">
      {/* Linked Account Card */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <RiUserSharedLine className="size-5 text-primary" />
              <CardTitle className="font-heading text-base font-semibold">
                Linked Account Association
              </CardTitle>
            </div>
            {linkedAccount.type === "employee" && (
              <Badge variant="outline" className="font-mono text-xs gap-1 border-primary/40 bg-primary/5 text-primary w-fit">
                <RiBuildingLine className="size-3.5" />
                Staff Employee
              </Badge>
            )}
            {linkedAccount.type === "customer" && (
              <Badge variant="outline" className="font-mono text-xs gap-1 border-blue-500/40 bg-blue-500/5 text-blue-600 dark:text-blue-400 w-fit">
                <RiUserLine className="size-3.5" />
                CRM Customer / {linkedAccount.data.type || "PATIENT"}
              </Badge>
            )}
            {linkedAccount.type === "none" && (
              <Badge variant="secondary" className="font-mono text-xs gap-1 w-fit">
                <RiInformationLine className="size-3.5" />
                Standalone / Non-linked
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs font-mono">
            Tracks whether this authentication identity is linked to an operational staff employee or customer CRM record.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {linkedAccount.type === "employee" ? (
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Full Name</span>
                  <span className="font-medium text-foreground text-sm">{linkedAccount.data.fullName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Employee Code</span>
                  <span className="font-semibold text-foreground text-sm">{linkedAccount.data.employeeCode}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Employment Status</span>
                  <Badge variant="outline" className="text-[10px] mt-0.5">
                    {linkedAccount.data.employmentStatus}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Department / Role</span>
                  <span className="text-foreground">
                    {linkedAccount.data.departmentCode || linkedAccount.data.jobTitleCode || "General Staff"}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">
                  Employee UUID: <code className="text-foreground">{linkedAccount.data.id}</code>
                </span>
                <Button variant="ghost" size="sm" className="h-7 gap-1 font-mono text-xs" render={<Link href="/employees" />}>
                  <span>View in Staff Directory</span>
                  <RiExternalLinkLine className="size-3.5" />
                </Button>
              </div>
            </div>
          ) : linkedAccount.type === "customer" ? (
            <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Customer Name</span>
                  <span className="font-medium text-foreground text-sm">{linkedAccount.data.fullName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Customer Code</span>
                  <span className="font-semibold text-foreground text-sm">{linkedAccount.data.customerCode || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Customer Type</span>
                  <Badge variant="outline" className="text-[10px] mt-0.5">
                    {linkedAccount.data.type || "CUSTOMER"}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Record Status</span>
                  <Badge variant="secondary" className="text-[10px] mt-0.5">
                    {linkedAccount.data.status || "ACTIVE"}
                  </Badge>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">
                  Customer UUID: <code className="text-foreground">{linkedAccount.data.id}</code>
                </span>
                <Button variant="ghost" size="sm" className="h-7 gap-1 font-mono text-xs" render={<Link href="/customers" />}>
                  <span>View in Customers CRM</span>
                  <RiExternalLinkLine className="size-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-medium text-sm text-foreground">
                    Non-Linked Auth Account
                  </span>
                  <Badge variant="secondary" className="font-mono text-[10px]">UNLINKED</Badge>
                </div>
                <p className="font-mono text-xs text-muted-foreground max-w-xl">
                  This user account is an independent auth identity and has not yet been linked to a Customer or Employee record. When creating a Customer or Employee, pass this user&apos;s UUID (<code className="text-foreground">{user.id}</code>) to link them.
                </p>
              </div>
              <div className="flex items-center gap-2 mt-3 sm:mt-0 shrink-0">
                <Button variant="outline" size="sm" className="font-mono text-xs" render={<Link href="/customers" />}>
                  Customers CRM
                </Button>
                <Button variant="outline" size="sm" className="font-mono text-xs" render={<Link href="/employees" />}>
                  Employees Staff
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connected Social Identities Card */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <RiLinksLine className="size-5 text-primary" />
              <CardTitle className="font-heading text-base font-semibold">
                Connected Social Identities
              </CardTitle>
            </div>
            {oauthAccounts.length > 0 ? (
              <Badge variant="outline" className="font-mono text-xs w-fit">
                {oauthAccounts.length} Provider{oauthAccounts.length > 1 ? "s" : ""} Linked
              </Badge>
            ) : (
              <Badge variant="secondary" className="font-mono text-xs gap-1 w-fit">
                <RiLockPasswordLine className="size-3.5" />
                Password / Local Auth
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs font-mono">
            Federated identity providers (Google, GitHub, Discord, Microsoft, Telegram) linked to this account.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {unlinkFeedback && (
            <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-2 font-mono text-xs text-destructive">
              {unlinkFeedback}
            </div>
          )}

          {oauthAccounts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 font-mono text-xs text-muted-foreground">
              No external social providers linked. This user signs in using local credentials (email/phone + password or passkey).
            </div>
          ) : (
            <div className="space-y-2.5">
              {oauthAccounts.map((acc) => {
                const rawUsername =
                  typeof acc.rawProfile?.username === "string"
                    ? `@${acc.rawProfile.username}`
                    : null
                return (
                  <div
                    key={acc.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 p-3.5 font-mono text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-card text-foreground">
                        <OAuthProviderIcon code={acc.provider} className="size-4" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground uppercase">
                            {acc.provider}
                          </span>
                          {rawUsername && (
                            <Badge variant="secondary" className="font-mono text-[10px]">
                              {rawUsername}
                            </Badge>
                          )}
                          {acc.email && (
                            <span className="text-muted-foreground truncate">
                              {acc.email}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          Provider ID: {acc.providerUserId}
                          {acc.lastLoginAt
                            ? ` · Last login: ${new Date(acc.lastLoginAt).toLocaleString()}`
                            : ""}
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive font-mono text-xs gap-1.5 shrink-0 w-fit"
                      disabled={unlinkingProvider === acc.provider}
                      onClick={async () => {
                        if (!confirm(`Unlink ${acc.provider} from this user?`)) return
                        setUnlinkingProvider(acc.provider)
                        setUnlinkFeedback(null)
                        const res = await adminUnlinkUserOAuthAction(user.id, acc.provider)
                        setUnlinkingProvider(null)
                        if (!res.success && res.message) {
                          setUnlinkFeedback(res.message)
                        }
                      }}
                    >
                      <RiDeleteBinLine className="size-3.5" />
                      Unlink
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Information Form Card */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader>
          <div className="flex items-center gap-2">
            <RiInformationLine className="size-5 text-primary" />
            <CardTitle className="font-heading text-base font-semibold">
              Edit User Information
            </CardTitle>
          </div>
          <CardDescription className="text-xs font-mono">
            Modify credentials, contact channels, verification states, and security requirements.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {feedback && (
              <div
                className={`p-3 rounded-md font-mono text-xs flex items-center gap-2 ${
                  feedback.type === "success"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                    : "bg-destructive/10 text-destructive border border-destructive/30"
                }`}
              >
                {feedback.type === "success" ? (
                  <RiCheckLine className="size-4 shrink-0" />
                ) : (
                  <RiCloseLine className="size-4 shrink-0" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-mono text-xs">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="font-mono text-xs"
                />
                <span className="text-[11px] text-muted-foreground font-mono block">
                  Primary identifier for console login and notifications.
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="font-mono text-xs">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+85512345678"
                  className="font-mono text-xs"
                />
                <span className="text-[11px] text-muted-foreground font-mono block">
                  E.164 standard formatted international phone number.
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-4">
              <h4 className="font-heading text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Account Status & Verification Flags
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-md bg-card border border-border/40">
                  <div className="space-y-0.5">
                    <Label htmlFor="is-active" className="font-mono text-xs font-medium cursor-pointer">
                      Account Active
                    </Label>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      Deactivating revokes access to console and tokens.
                    </p>
                  </div>
                  <Switch
                    id="is-active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-md bg-card border border-border/40">
                  <div className="space-y-0.5">
                    <Label htmlFor="is-email-verified" className="font-mono text-xs font-medium cursor-pointer">
                      Email Verified
                    </Label>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      Indicates email address ownership confirmed.
                    </p>
                  </div>
                  <Switch
                    id="is-email-verified"
                    checked={isEmailVerified}
                    onCheckedChange={setIsEmailVerified}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-md bg-card border border-border/40">
                  <div className="space-y-0.5">
                    <Label htmlFor="is-phone-verified" className="font-mono text-xs font-medium cursor-pointer">
                      Phone Verified
                    </Label>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      Indicates SMS OTP / phone verification passed.
                    </p>
                  </div>
                  <Switch
                    id="is-phone-verified"
                    checked={isPhoneVerified}
                    onCheckedChange={setIsPhoneVerified}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-md bg-card border border-border/40">
                  <div className="space-y-0.5">
                    <Label htmlFor="must-change-password" className="font-mono text-xs font-medium cursor-pointer">
                      Force Password Change
                    </Label>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      Require new password setup on next login.
                    </p>
                  </div>
                  <Switch
                    id="must-change-password"
                    checked={mustChangePassword}
                    onCheckedChange={setMustChangePassword}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-muted-foreground font-mono text-[11px]">
                <RiShieldCheckLine className="size-4 text-emerald-500" />
                <span>Changes will take effect immediately across all active sessions.</span>
              </div>

              <Button type="submit" disabled={saving} className="gap-2 font-mono text-xs">
                <RiSaveLine className="size-4" />
                <span>{saving ? "Saving..." : "Save Changes"}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Readonly Account Metadata */}
      <Card className="border-border/50 bg-muted/10 shadow-xs">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">User UUID</span>
              <span className="font-mono text-[11px] text-foreground select-all">{user.id}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Account Created</span>
              <span className="text-foreground">
                {user.createdAt ? new Date(user.createdAt).toLocaleString() : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Last Updated</span>
              <span className="text-foreground">
                {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Last Login</span>
              <span className="text-foreground">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never logged in"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
