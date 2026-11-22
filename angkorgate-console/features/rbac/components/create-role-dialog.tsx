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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  RiAddLine,
  RiLoader4Line,
  RiShieldKeyholeLine,
  RiSearchLine,
} from "@remixicon/react"
import type { Permission } from "../types/rbac.types"
import { createRoleAction } from "../server/rbac-actions"

interface CreateRoleDialogProps {
  permissions?: Permission[]
}

export function CreateRoleDialog({ permissions = [] }: CreateRoleDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")

  const filteredPermissions = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return permissions
    return permissions.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.resource.toLowerCase().includes(q) ||
        p.action.toLowerCase().includes(q)
    )
  }, [permissions, search])

  const handleToggle = (permCode: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev)
      if (next.has(permCode)) next.delete(permCode)
      else next.add(permCode)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await createRoleAction({
      code: code.toUpperCase().trim(),
      name: name.trim(),
      description: description.trim() || undefined,
      permissionCodes: Array.from(selectedCodes),
    })

    setLoading(false)
    if (res.success) {
      setOpen(false)
      setCode("")
      setName("")
      setDescription("")
      setSelectedCodes(new Set())
      setSearch("")
    } else {
      setError(res.message || "Failed to create role")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="font-mono text-xs">
            <RiAddLine className="mr-1.5 size-4" /> Create Role
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border/50">
            <DialogTitle className="font-heading text-lg flex items-center gap-2">
              <RiShieldKeyholeLine className="size-5 text-primary" />
              Define RBAC Role
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Create a new security role with assignable permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-xs">
            {error && (
              <div className="font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/20">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="create-role-code">Role Code (UPPER_SNAKE_CASE)</Label>
              <Input
                id="create-role-code"
                placeholder="OPERATOR"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
              />
              <span className="text-[10px] text-muted-foreground">
                Example: AUDITOR, SUPPORT_TIER_2, COMPLIANCE_OFFICER
              </span>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="create-role-name">Role Name</Label>
              <Input
                id="create-role-name"
                placeholder="Operations Specialist"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="create-role-desc">Description</Label>
              <Input
                id="create-role-desc"
                placeholder="Full operational access to customers and employee records"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Initial Permissions Selector with Checkboxes */}
            {permissions.length > 0 && (
              <div className="pt-2 border-t border-border/40 space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Attach Permissions ({selectedCodes.size} selected)</Label>
                  <span className="text-[10px] text-muted-foreground">
                    Optional — can also be modified later
                  </span>
                </div>

                <div className="relative">
                  <RiSearchLine className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search permissions..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 text-xs font-mono"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto rounded-md border border-border/50 divide-y divide-border/30 bg-muted/20">
                  {filteredPermissions.map((p) => {
                    const checked = selectedCodes.has(p.code)
                    return (
                      <div
                        key={p.code}
                        onClick={() => handleToggle(p.code)}
                        className={`flex items-center gap-2.5 p-2 transition-colors cursor-pointer select-none ${
                          checked ? "bg-primary/5" : "hover:bg-muted/40"
                        }`}
                      >
                        <Checkbox
                          id={`new-perm-${p.code}`}
                          checked={checked}
                          onCheckedChange={() => handleToggle(p.code)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant={checked ? "default" : "outline"}
                              className="font-mono text-[11px] py-0"
                            >
                              {p.code}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground uppercase">
                              {p.action}
                            </span>
                          </div>
                          {p.description && (
                            <p className="text-[10px] text-muted-foreground truncate font-sans">
                              {p.description}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 px-6 border-t border-border/50 bg-muted/20">
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
            <Button type="submit" size="sm" disabled={loading} className="font-mono text-xs">
              {loading ? (
                <>
                  <RiLoader4Line className="mr-1.5 size-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Role"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
