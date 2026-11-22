"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  RiUserSharedLine,
  RiSearchLine,
  RiLoader4Line,
  RiAddLine,
  RiDeleteBinLine,
  RiShieldCheckLine,
  RiShieldCrossLine,
} from "@remixicon/react"
import type { Permission, UserPermissionOverride } from "../types/rbac.types"
import {
  getUserEffectivePermissions,
  getUserRoleCodes,
  getUserOverrides,
  setUserOverrideAction,
  clearUserOverrideAction,
} from "../server/rbac-actions"

interface UserOverridesDialogProps {
  allPermissions: Permission[]
  trigger?: React.ReactElement
}

export function UserOverridesDialog({
  allPermissions,
  trigger,
}: UserOverridesDialogProps) {
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState("")
  const [querying, setQuerying] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Queried user data
  const [queriedUserId, setQueriedUserId] = useState<string | null>(null)
  const [effectivePerms, setEffectivePerms] = useState<string[]>([])
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [overrides, setOverrides] = useState<UserPermissionOverride[]>([])

  // Form for adding a new override
  const [overridePermCode, setOverridePermCode] = useState("")
  const [overrideEffect, setOverrideEffect] = useState<"GRANT" | "REVOKE">("GRANT")

  const handleFetchUser = async (targetId?: string) => {
    const idToFetch = (targetId || userId).trim()
    if (!idToFetch) return

    setQuerying(true)
    setError(null)

    try {
      const [perms, roles, ovs] = await Promise.all([
        getUserEffectivePermissions(idToFetch),
        getUserRoleCodes(idToFetch),
        getUserOverrides(idToFetch),
      ])
      setQueriedUserId(idToFetch)
      setEffectivePerms(perms)
      setUserRoles(roles)
      setOverrides(ovs)
    } catch (err: any) {
      setError(err.message || "Failed to query user permissions")
    } finally {
      setQuerying(false)
    }
  }

  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!queriedUserId || !overridePermCode) return

    setSaving(true)
    setError(null)

    const res = await setUserOverrideAction({
      userId: queriedUserId,
      permissionCode: overridePermCode,
      effect: overrideEffect,
    })

    setSaving(false)
    if (res.success) {
      setOverridePermCode("")
      await handleFetchUser(queriedUserId)
    } else {
      setError(res.message || "Failed to set override")
    }
  }

  const handleClearOverride = async (code: string) => {
    if (!queriedUserId) return
    setSaving(true)
    setError(null)

    const res = await clearUserOverrideAction(queriedUserId, code)
    setSaving(false)
    if (res.success) {
      await handleFetchUser(queriedUserId)
    } else {
      setError(res.message || "Failed to clear override")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            trigger
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs gap-1.5"
            >
              <RiUserSharedLine className="size-3.5 text-primary" />
              User Overrides Explorer
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/50">
          <DialogTitle className="font-heading text-lg flex items-center gap-2">
            <RiUserSharedLine className="size-5 text-primary" />
            User Permission Overrides & Effective Access
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            Inspect effective permissions granted via roles, and apply explicit GRANT or REVOKE overrides.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs">
          {error && (
            <div className="font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/20">
              {error}
            </div>
          )}

          {/* User Lookup */}
          <div className="space-y-2">
            <Label htmlFor="lookup-user-id">Enter User UUID</Label>
            <div className="flex items-center gap-2">
              <Input
                id="lookup-user-id"
                placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="font-mono text-xs h-9"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => handleFetchUser()}
                disabled={querying || !userId.trim()}
                className="font-mono text-xs h-9"
              >
                {querying ? (
                  <RiLoader4Line className="size-4 animate-spin" />
                ) : (
                  <>
                    <RiSearchLine className="mr-1 size-3.5" /> Inspect User
                  </>
                )}
              </Button>
            </div>
          </div>

          {queriedUserId && (
            <div className="space-y-6 pt-2 border-t border-border/40">
              {/* User Roles */}
              <div className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Assigned Roles:</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {userRoles.length} roles
                  </Badge>
                </div>
                {userRoles.length === 0 ? (
                  <p className="text-muted-foreground text-xs italic">
                    User has no direct roles assigned.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {userRoles.map((r) => (
                      <Badge key={r} variant="default" className="font-mono text-xs">
                        {r}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Permission Overrides */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    Active Permission Overrides ({overrides.length})
                  </span>
                </div>

                {overrides.length === 0 ? (
                  <p className="text-muted-foreground text-xs italic p-3 rounded-md border border-border/40 bg-muted/10">
                    No custom overrides configured for this user.
                  </p>
                ) : (
                  <div className="divide-y divide-border/30 rounded-md border border-border/50 overflow-hidden">
                    {overrides.map((ov) => (
                      <div
                        key={ov.permissionCode}
                        className="flex items-center justify-between p-2.5 bg-card hover:bg-muted/20"
                      >
                        <div className="flex items-center gap-2">
                          {ov.effect === "GRANT" ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 font-mono text-[11px]">
                              <RiShieldCheckLine className="size-3" /> GRANT
                            </Badge>
                          ) : (
                            <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1 font-mono text-[11px]">
                              <RiShieldCrossLine className="size-3" /> REVOKE
                            </Badge>
                          )}
                          <span className="font-mono text-xs font-medium text-foreground">
                            {ov.permissionCode}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={saving}
                          onClick={() => handleClearOverride(ov.permissionCode)}
                          title="Clear Override"
                        >
                          <RiDeleteBinLine className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Override Form */}
                <form
                  onSubmit={handleAddOverride}
                  className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-3"
                >
                  <span className="font-semibold text-foreground block">
                    Add User-Specific Override
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <select
                        value={overridePermCode}
                        onChange={(e) => setOverridePermCode(e.target.value)}
                        required
                        className="w-full h-9 rounded-md border border-input bg-background px-3 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      >
                        <option value="">Select permission to override...</option>
                        {allPermissions.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.code} ({p.resource}:{p.action})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <select
                        value={overrideEffect}
                        onChange={(e) =>
                          setOverrideEffect(e.target.value as "GRANT" | "REVOKE")
                        }
                        className="w-full h-9 rounded-md border border-input bg-background px-3 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      >
                        <option value="GRANT">GRANT (Allow)</option>
                        <option value="REVOKE">REVOKE (Deny)</option>
                      </select>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={saving || !overridePermCode}
                    className="font-mono text-xs h-8"
                  >
                    <RiAddLine className="mr-1 size-3.5" /> Set Override
                  </Button>
                </form>
              </div>

              {/* Effective Permissions Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <RiShieldCheckLine className="size-4 text-primary" />
                    Effective Permissions ({effectivePerms.length})
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Resolved union of roles + overrides
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 p-3 rounded-md border border-border/40 bg-muted/10 max-h-48 overflow-y-auto">
                  {effectivePerms.length === 0 ? (
                    <span className="text-muted-foreground italic">
                      No effective permissions resolved for this user.
                    </span>
                  ) : (
                    effectivePerms.map((code) => (
                      <Badge
                        key={code}
                        variant="secondary"
                        className="font-mono text-[11px]"
                      >
                        {code}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
