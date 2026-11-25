"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  RiUserLine,
  RiMailLine,
  RiPhoneLine,
  RiShieldCheckLine,
  RiCheckLine,
  RiCloseLine,
  RiLoader4Line,
  RiFileCopyLine,
  RiTimeLine,
  RiInformationLine,
} from "@remixicon/react"
import type { UserProfile } from "../types/account.types"
import { updateMyProfile } from "../server/account-actions"

interface AccountProfileTabProps {
  profile: UserProfile
  onProfileUpdated?: (updated: UserProfile) => void
}

export function AccountProfileTab({
  profile,
  onProfileUpdated,
}: AccountProfileTabProps) {
  const [fullName, setFullName] = useState(profile.fullName || "")
  const [phone, setPhone] = useState(profile.phone || "")
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [copiedId, setCopiedId] = useState(false)

  const handleCopyId = () => {
    navigator.clipboard.writeText(profile.id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)

    const result = await updateMyProfile({
      fullName: fullName.trim() || undefined,
      phone: phone.trim() || undefined,
    })

    setLoading(false)
    if (result.success && result.data) {
      setFeedback({ type: "success", message: result.message || "Profile updated." })
      if (onProfileUpdated) {
        onProfileUpdated(result.data)
      }
    } else {
      setFeedback({
        type: "error",
        message: result.message || "Failed to update profile.",
      })
    }
  }

  const initials = (profile.fullName || profile.email || "AG")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="space-y-6">
      {/* Identity Summary Card */}
      <Card className="border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20 bg-muted">
                <AvatarFallback className="text-lg font-bold text-primary font-mono">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold font-sans">
                    {profile.fullName || "Account User"}
                  </h2>
                  {profile.roles?.map((role) => (
                    <Badge
                      key={role}
                      variant="outline"
                      className="border-primary/40 bg-primary/10 text-primary font-mono text-xs uppercase"
                    >
                      {role}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground font-mono">
                  {profile.email || "No email on file"}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyId}
              className="text-xs font-mono h-8 border-border"
            >
              {copiedId ? (
                <>
                  <RiCheckLine className="h-3.5 w-3.5 mr-1 text-green-500" />
                  Copied ID
                </>
              ) : (
                <>
                  <RiFileCopyLine className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  Copy Account ID
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <RiUserLine className="h-5 w-5 text-primary" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Update your public display name and contact phone number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-xs font-mono text-muted-foreground">
                  FULL NAME
                </Label>
                <Input
                  id="fullName"
                  placeholder="e.g. Dara Sok"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-background border-border"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-mono text-muted-foreground">
                  PHONE NUMBER
                </Label>
                <div className="relative">
                  <RiPhoneLine className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="+85512345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-9 bg-background border-border font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Email (Read-only) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email" className="text-xs font-mono text-muted-foreground">
                    PRIMARY EMAIL
                  </Label>
                  {profile.isEmailVerified ? (
                    <span className="flex items-center text-xs text-green-500 font-mono">
                      <RiShieldCheckLine className="h-3 w-3 mr-1" />
                      Verified
                    </span>
                  ) : (
                    <span className="text-xs text-amber-500 font-mono">Unverified</span>
                  )}
                </div>
                <div className="relative">
                  <RiMailLine className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    value={profile.email || ""}
                    disabled
                    className="pl-9 bg-muted/50 border-border text-muted-foreground cursor-not-allowed font-mono text-sm"
                  />
                </div>
              </div>

              {/* Account Created At */}
              <div className="space-y-2">
                <Label className="text-xs font-mono text-muted-foreground">MEMBER SINCE</Label>
                <div className="relative">
                  <RiTimeLine className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={
                      profile.createdAt
                        ? new Date(profile.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "Unknown"
                    }
                    disabled
                    className="pl-9 bg-muted/50 border-border text-muted-foreground cursor-not-allowed font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Linked Entity Card (Customer or Employee) */}
            {(profile.customer || profile.employee) && (
              <div className="p-3 rounded-lg border border-border/60 bg-muted/20 text-xs font-mono space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                  <RiInformationLine className="h-3.5 w-3.5 text-primary" />
                  LINKED DIRECTORY RECORD
                </div>
                {profile.customer && (
                  <p className="text-foreground">
                    Customer Account:{" "}
                    <span className="text-primary font-bold">
                      {profile.customer.customerCode}
                    </span>{" "}
                    ({profile.customer.type}) — Status: {profile.customer.status || "ACTIVE"}
                  </p>
                )}
                {profile.employee && (
                  <p className="text-foreground">
                    Employee Record:{" "}
                    <span className="text-primary font-bold">
                      {profile.employee.employeeCode}
                    </span>{" "}
                    — Status: {profile.employee.employmentStatus || "ACTIVE"}
                  </p>
                )}
              </div>
            )}

            {/* Feedback Alert */}
            {feedback && (
              <div
                className={`p-3 rounded-lg flex items-center gap-2 text-sm font-sans ${
                  feedback.type === "success"
                    ? "bg-green-500/10 text-green-500 border border-green-500/20"
                    : "bg-red-500/10 text-red-500 border border-red-500/20"
                }`}
              >
                {feedback.type === "success" ? (
                  <RiCheckLine className="h-4 w-4 shrink-0" />
                ) : (
                  <RiCloseLine className="h-4 w-4 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={loading} className="gap-2">
                {loading && <RiLoader4Line className="h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
