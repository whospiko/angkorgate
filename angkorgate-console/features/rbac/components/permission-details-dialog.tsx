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
import { Badge } from "@/components/ui/badge"
import {
  RiShieldCheckLine,
  RiInformationLine,
  RiShieldUserLine,
  RiLoader4Line,
} from "@remixicon/react"
import type { Permission, Role } from "../types/rbac.types"
import { getPermissionByCode } from "../server/rbac-actions"

interface PermissionDetailsDialogProps {
  permission: Permission
  roles: Role[]
  trigger?: React.ReactElement
}

export function PermissionDetailsDialog({
  permission,
  roles,
  trigger,
}: PermissionDetailsDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [details, setDetails] = useState<Permission>(permission)

  const rolesWithPermission = roles.filter((r) =>
    r.permissions?.includes(permission.code)
  )

  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setLoading(true)
      const fetched = await getPermissionByCode(permission.code)
      if (fetched) setDetails(fetched)
      setLoading(false)
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
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
            >
              <RiInformationLine className="size-4" />
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg flex items-center gap-2">
            <RiShieldCheckLine className="size-5 text-primary" />
            Permission Details
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            Granular access policy and role mappings.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <RiLoader4Line className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-2 font-mono text-xs">
            <div className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Permission Code:</span>
                <Badge variant="default" className="font-mono text-xs">
                  {details.code}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Target Resource:</span>
                <span className="font-semibold text-foreground">{details.resource}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Allowed Action:</span>
                <Badge variant="secondary" className="font-mono text-[10px] uppercase">
                  {details.action}
                </Badge>
              </div>

              {details.description && (
                <div className="pt-2 border-t border-border/40">
                  <span className="text-muted-foreground block mb-1">Description:</span>
                  <p className="font-sans text-xs text-foreground leading-relaxed">
                    {details.description}
                  </p>
                </div>
              )}
            </div>

            {/* Roles granting this permission */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <RiShieldUserLine className="size-4 text-primary" />
                  Granted by Roles ({rolesWithPermission.length})
                </span>
              </div>

              {rolesWithPermission.length === 0 ? (
                <p className="text-muted-foreground text-xs italic p-3 rounded-md border border-border/40 bg-muted/10">
                  No roles currently assign this permission code.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 p-3 rounded-md border border-border/40 bg-muted/10 max-h-40 overflow-y-auto">
                  {rolesWithPermission.map((r) => (
                    <Badge
                      key={r.id}
                      variant="outline"
                      className="font-mono text-xs gap-1 py-1"
                    >
                      <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                      {r.name} ({r.code})
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
