"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  RiKey2Line,
  RiSearchLine,
  RiLoader4Line,
  RiCheckDoubleLine,
  RiCloseCircleLine,
  RiShieldCheckLine,
} from "@remixicon/react"
import type { Role, Permission } from "../types/rbac.types"
import { updateRolePermissionsAction } from "../server/rbac-actions"

interface RolePermissionsDialogProps {
  role: Role
  allPermissions: Permission[]
  trigger?: React.ReactElement
}

export function RolePermissionsDialog({
  role,
  allPermissions,
  trigger,
}: RolePermissionsDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [selectedResource, setSelectedResource] = useState<string>("all")

  // Local state initialized with current role's assigned permissions
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(
    () => new Set(role.permissions || [])
  )

  // Reset selection when dialog opens or role updates
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setSelectedCodes(new Set(role.permissions || []))
      setSearch("")
      setError(null)
      setSelectedResource("all")
    }
  }

  // Extract distinct resource categories
  const resources = useMemo(() => {
    const list = Array.from(new Set(allPermissions.map((p) => p.resource))).sort()
    return ["all", ...list]
  }, [allPermissions])

  // Filter permissions by search query and resource
  const filteredPermissions = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allPermissions.filter((p) => {
      const matchResource = selectedResource === "all" || p.resource === selectedResource
      if (!matchResource) return false
      if (!q) return true
      return (
        p.code.toLowerCase().includes(q) ||
        p.resource.toLowerCase().includes(q) ||
        p.action.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      )
    })
  }, [allPermissions, search, selectedResource])

  // Group filtered permissions by resource
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {}
    for (const p of filteredPermissions) {
      if (!groups[p.resource]) groups[p.resource] = []
      groups[p.resource].push(p)
    }
    return groups
  }, [filteredPermissions])

  // Toggle single permission
  const handleToggle = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      return next
    })
  }

  // Select all currently filtered permissions
  const handleSelectAllFiltered = () => {
    setSelectedCodes((prev) => {
      const next = new Set(prev)
      for (const p of filteredPermissions) {
        next.add(p.code)
      }
      return next
    })
  }

  // Deselect all currently filtered permissions
  const handleDeselectAllFiltered = () => {
    setSelectedCodes((prev) => {
      const next = new Set(prev)
      for (const p of filteredPermissions) {
        next.delete(p.code)
      }
      return next
    })
  }

  // Toggle all permissions within a specific resource group
  const handleToggleGroup = (resource: string, perms: Permission[]) => {
    const allChecked = perms.every((p) => selectedCodes.has(p.code))
    setSelectedCodes((prev) => {
      const next = new Set(prev)
      for (const p of perms) {
        if (allChecked) {
          next.delete(p.code)
        } else {
          next.add(p.code)
        }
      }
      return next
    })
  }

  // Save permissions
  const handleSave = async () => {
    setLoading(true)
    setError(null)

    const codesArray = Array.from(selectedCodes)
    const res = await updateRolePermissionsAction(role.id, codesArray)

    setLoading(false)
    if (res.success) {
      setOpen(false)
    } else {
      setError(res.message || "Failed to update role permissions")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          trigger ? (
            trigger
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs gap-1.5 h-8 border-border/60 hover:border-primary/40"
            >
              <RiKey2Line className="size-3.5 text-primary" />
              Permissions ({role.permissions?.length ?? 0})
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="font-heading text-lg flex items-center gap-2">
                <RiShieldCheckLine className="size-5 text-primary" />
                Manage Permissions: {role.name}
              </DialogTitle>
              <DialogDescription className="font-mono text-xs text-muted-foreground mt-1">
                Configure assigned security permission codes for role{" "}
                <span className="font-semibold text-foreground">{role.code}</span>.
              </DialogDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs shrink-0">
              {selectedCodes.size} / {allPermissions.length} selected
            </Badge>
          </div>
        </DialogHeader>

        {error && (
          <div className="mx-6 mt-3 font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/20">
            {error}
          </div>
        )}

        {/* Filter and Category Controls */}
        <div className="px-6 py-3 border-b border-border/40 space-y-3 bg-muted/20">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <RiSearchLine className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search permissions by code, resource, action, description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAllFiltered}
                className="font-mono text-xs h-9 flex-1 sm:flex-initial"
              >
                <RiCheckDoubleLine className="mr-1 size-3.5 text-emerald-500" />
                Select All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeselectAllFiltered}
                className="font-mono text-xs h-9 flex-1 sm:flex-initial"
              >
                <RiCloseCircleLine className="mr-1 size-3.5 text-muted-foreground" />
                Clear
              </Button>
            </div>
          </div>

          {/* Resource Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 max-h-20 overflow-y-auto">
            {resources.map((res) => (
              <button
                key={res}
                type="button"
                onClick={() => setSelectedResource(res)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                  selectedResource === res
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {res === "all" ? "All Resources" : res}
              </button>
            ))}
          </div>
        </div>

        {/* Permissions List with Checkboxes */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {filteredPermissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground font-mono text-xs">
              No permissions found matching &quot;{search}&quot;.
            </div>
          ) : (
            Object.entries(groupedPermissions).map(([resource, perms]) => {
              const allGroupChecked = perms.every((p) => selectedCodes.has(p.code))
              const someGroupChecked =
                !allGroupChecked && perms.some((p) => selectedCodes.has(p.code))

              return (
                <div
                  key={resource}
                  className="rounded-lg border border-border/50 bg-card overflow-hidden"
                >
                  {/* Group Header */}
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-muted/40 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`group-${resource}`}
                        checked={allGroupChecked}
                        indeterminate={someGroupChecked}
                        onCheckedChange={() => handleToggleGroup(resource, perms)}
                      />
                      <label
                        htmlFor={`group-${resource}`}
                        className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground cursor-pointer select-none"
                      >
                        {resource} ({perms.filter((p) => selectedCodes.has(p.code)).length} / {perms.length})
                      </label>
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      Module: {resource}
                    </span>
                  </div>

                  {/* Group Items */}
                  <div className="divide-y divide-border/30">
                    {perms.map((p) => {
                      const isChecked = selectedCodes.has(p.code)
                      return (
                        <div
                          key={p.code}
                          onClick={() => handleToggle(p.code)}
                          className={`flex items-start gap-3 p-3 transition-colors cursor-pointer select-none ${
                            isChecked
                              ? "bg-primary/5 hover:bg-primary/10"
                              : "hover:bg-muted/30"
                          }`}
                        >
                          <Checkbox
                            id={`perm-${p.code}`}
                            checked={isChecked}
                            onCheckedChange={() => handleToggle(p.code)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant={isChecked ? "default" : "outline"}
                                className={`font-mono text-xs ${
                                  isChecked
                                    ? "bg-primary text-primary-foreground font-semibold"
                                    : "text-foreground"
                                }`}
                              >
                                {p.code}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className="font-mono text-[10px] uppercase text-muted-foreground"
                              >
                                {p.action}
                              </Badge>
                            </div>
                            {p.description && (
                              <p className="font-sans text-xs text-muted-foreground mt-1">
                                {p.description}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Dialog Footer */}
        <DialogFooter className="p-4 px-6 border-t border-border/50 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="font-mono text-xs text-muted-foreground flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary inline-block" />
            <span>
              <strong>{selectedCodes.size}</strong> permission
              {selectedCodes.size === 1 ? "" : "s"} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="font-mono text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={loading}
              className="font-mono text-xs"
            >
              {loading ? (
                <>
                  <RiLoader4Line className="mr-1.5 size-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Permissions"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
