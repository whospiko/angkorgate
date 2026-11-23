"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  RiShieldUserLine,
  RiKey2Line,
  RiCheckLine,
  RiCloseLine,
  RiSaveLine,
  RiInformationLine,
  RiLockLine,
} from "@remixicon/react"
import type { User } from "../types/users.types"
import type { Role, Permission } from "@/features/rbac/types/rbac.types"
import { replaceUserRolesAction } from "../server/users-actions"

interface UserAssignTabProps {
  user: User
  allRoles: Role[]
  allPermissions: Permission[]
}

export function UserAssignTab({ user, allRoles, allPermissions }: UserAssignTabProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles || [])
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Toggle role selection
  const handleRoleToggle = (roleCode: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleCode)
        ? prev.filter((r) => r !== roleCode)
        : [...prev, roleCode]
    )
  }

  // Save updated roles via Bulk Assign / Replace API
  const handleSaveRoles = async () => {
    setSaving(true)
    setFeedback(null)

    try {
      const res = await replaceUserRolesAction(user.id, selectedRoles)
      if (res.success) {
        setFeedback({
          type: "success",
          text: `Roles successfully updated to: ${selectedRoles.length > 0 ? selectedRoles.join(", ") : "None (Cleared)"}.`,
        })
      } else {
        setFeedback({
          type: "error",
          text: res.message || "Failed to update role assignments.",
        })
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "An unexpected error occurred." })
    } finally {
      setSaving(false)
    }
  }

  // Calculate permissions map for currently selected/assigned roles
  const assignedRolesObjects = allRoles.filter((r) => selectedRoles.includes(r.code))

  // Map of permission code -> array of role codes that grant it
  const grantedPermissionsMap = new Map<string, string[]>()
  assignedRolesObjects.forEach((role) => {
    const perms = role.permissions || []
    perms.forEach((permCode) => {
      const existing = grantedPermissionsMap.get(permCode) || []
      if (!existing.includes(role.code)) {
        existing.push(role.code)
      }
      grantedPermissionsMap.set(permCode, existing)
    })
  })

  // Group granted permissions by resource prefix (e.g. "user", "app", "customer")
  const groupedPermissions = new Map<string, Array<{ code: string; roles: string[]; description?: string | null }>>()
  grantedPermissionsMap.forEach((roles, permCode) => {
    const resource = permCode.includes(":") ? permCode.split(":")[0] : "general"
    const permObj = allPermissions.find((p) => p.code === permCode)
    const list = groupedPermissions.get(resource) || []
    list.push({
      code: permCode,
      roles,
      description: permObj?.description,
    })
    groupedPermissions.set(resource, list)
  })

  const hasChanges =
    selectedRoles.length !== (user.roles || []).length ||
    selectedRoles.some((r) => !(user.roles || []).includes(r))

  return (
    <div className="grid gap-6">
      {/* Role Assignment & Reassignment Card */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <RiShieldUserLine className="size-5 text-primary" />
              <CardTitle className="font-heading text-base font-semibold">
                Role Assignments & Reassignment
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {selectedRoles.length} Selected Roles
              </Badge>
              {hasChanges && (
                <Badge variant="secondary" className="font-mono text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Unsaved Changes
                </Badge>
              )}
            </div>
          </div>
          <CardDescription className="text-xs font-mono">
            Assign or revoke roles to configure this user&apos;s system privileges, security policies, and application access.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
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

          {/* Current Roles Pill Bar */}
          <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2">
            <span className="font-heading text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Active Role Assignments
            </span>
            <div className="flex flex-wrap gap-1.5">
              {selectedRoles.length > 0 ? (
                selectedRoles.map((roleCode) => {
                  const roleObj = allRoles.find((r) => r.code === roleCode)
                  return (
                    <Badge
                      key={roleCode}
                      variant="outline"
                      className="font-mono text-xs gap-1.5 py-1 px-2.5 bg-card border-primary/30"
                    >
                      <RiShieldUserLine className="size-3.5 text-primary" />
                      <span className="font-semibold text-foreground">{roleCode}</span>
                      {roleObj?.name && roleObj.name !== roleCode && (
                        <span className="text-muted-foreground font-sans">({roleObj.name})</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRoleToggle(roleCode)}
                        className="ml-1 text-muted-foreground hover:text-destructive focus:outline-none"
                        title={`Remove ${roleCode}`}
                      >
                        <RiCloseLine className="size-3" />
                      </button>
                    </Badge>
                  )
                })
              ) : (
                <span className="font-mono text-xs text-muted-foreground italic">
                  No roles currently selected for this user.
                </span>
              )}
            </div>
          </div>

          {/* Roles Selector Table/List */}
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <div className="bg-muted/40 px-4 py-2 border-b border-border/50 grid grid-cols-12 text-[11px] font-mono text-muted-foreground font-medium">
              <span className="col-span-1 text-center">Assign</span>
              <span className="col-span-3">Role Code</span>
              <span className="col-span-3">Display Name</span>
              <span className="col-span-3">Description</span>
              <span className="col-span-2 text-right">Granted Perms</span>
            </div>

            <div className="divide-y divide-border/40 font-mono text-xs">
              {allRoles.map((role) => {
                const isAssigned = selectedRoles.includes(role.code)
                return (
                  <div
                    key={role.id || role.code}
                    className={`px-4 py-3 grid grid-cols-12 items-center hover:bg-muted/20 transition-colors cursor-pointer ${
                      isAssigned ? "bg-primary/5" : ""
                    }`}
                    onClick={() => handleRoleToggle(role.code)}
                  >
                    <div className="col-span-1 flex items-center justify-center">
                      <Checkbox
                        checked={isAssigned}
                        onCheckedChange={() => handleRoleToggle(role.code)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="col-span-3 flex items-center gap-1.5 font-semibold text-foreground">
                      <span>{role.code}</span>
                      {role.isSystem && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">
                          SYSTEM
                        </Badge>
                      )}
                    </div>
                    <div className="col-span-3 text-muted-foreground font-sans text-xs">
                      {role.name}
                    </div>
                    <div className="col-span-3 text-muted-foreground text-[11px] truncate" title={role.description || ""}>
                      {role.description || "—"}
                    </div>
                    <div className="col-span-2 text-right">
                      <Badge variant="outline" className="text-[10px]">
                        {(role.permissions || []).length} perms
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Save Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] font-mono text-muted-foreground">
              Click checkboxes or rows to adjust role assignments, then click Save Roles.
            </span>
            <Button
              onClick={handleSaveRoles}
              disabled={saving || !hasChanges}
              className="gap-2 font-mono text-xs"
            >
              <RiSaveLine className="size-4" />
              <span>{saving ? "Updating..." : "Save Role Assignments"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Permissions on Assigned Roles Card */}
      <Card className="border-border/60 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <RiKey2Line className="size-5 text-primary" />
              <CardTitle className="font-heading text-base font-semibold">
                Permissions Granted by Assigned Roles
              </CardTitle>
            </div>
            <Badge variant="secondary" className="font-mono text-xs">
              {grantedPermissionsMap.size} Effective Permissions
            </Badge>
          </div>
          <CardDescription className="text-xs font-mono">
            Comprehensive audit of granular access rights and resource:action capabilities granted through currently assigned roles.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {grantedPermissionsMap.size > 0 ? (
            <div className="space-y-6">
              {Array.from(groupedPermissions.entries()).map(([resource, perms]) => (
                <div key={resource} className="rounded-lg border border-border/50 bg-muted/10 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-xs font-semibold uppercase tracking-wider text-primary">
                      {resource} Capabilities
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {perms.length} actions
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {perms.map((p) => (
                      <div
                        key={p.code}
                        className="flex items-start justify-between p-2 rounded-md bg-card border border-border/40 font-mono text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <RiLockLine className="size-3 text-muted-foreground" />
                            {p.code}
                          </span>
                          {p.description && (
                            <span className="text-[11px] text-muted-foreground block font-sans">
                              {p.description}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0 ml-2">
                          {p.roles.map((r) => (
                            <Badge key={r} variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-muted">
                              via {r}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 p-8 text-center bg-card">
              <RiInformationLine className="size-8 text-muted-foreground/60 mx-auto mb-2" />
              <h4 className="font-heading text-sm font-semibold">No Permissions Granted</h4>
              <p className="font-mono text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                This user has no assigned roles or the assigned roles contain no permissions. Assign roles above to grant access.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
