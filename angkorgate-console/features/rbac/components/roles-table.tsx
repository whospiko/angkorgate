"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  RiShieldKeyholeLine,
  RiDeleteBinLine,
  RiKey2Line,
  RiLockLine,
} from "@remixicon/react"
import type { Role, Permission } from "../types/rbac.types"
import { deleteRoleAction } from "../server/rbac-actions"
import { RolePermissionsDialog } from "./role-permissions-dialog"
import { EditRoleDialog } from "./edit-role-dialog"

interface RolesTableProps {
  roles: Role[]
  permissions: Permission[]
}

export function RolesTable({ roles, permissions }: RolesTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Delete role "${code}"? This will revoke this role from all assigned users.`)) {
      return
    }
    setLoadingId(id)
    try {
      await deleteRoleAction(id)
    } finally {
      setLoadingId(null)
    }
  }

  if (roles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-12 text-center bg-card">
        <RiShieldKeyholeLine className="size-10 text-muted-foreground/60 mb-3" />
        <h3 className="font-heading text-base font-semibold">No Roles Defined</h3>
        <p className="font-mono text-xs text-muted-foreground max-w-sm mt-1">
          Create roles to assign granular permissions across users and services.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="font-mono text-xs">Role Code</TableHead>
            <TableHead className="font-mono text-xs">Name & Description</TableHead>
            <TableHead className="font-mono text-xs">Permissions Assigned</TableHead>
            <TableHead className="font-mono text-xs text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((r) => {
            const permCount = r.permissions?.length ?? 0
            return (
              <TableRow key={r.id} className="font-mono text-xs hover:bg-muted/20">
                <TableCell className="font-semibold text-foreground">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {r.code}
                    </Badge>
                    {r.isSystem && (
                      <span
                        title="System-protected role cannot be deleted"
                        className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded"
                      >
                        <RiLockLine className="size-3 text-muted-foreground" />
                        System
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-sans font-medium text-sm text-foreground">{r.name}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {r.description || "No description provided"}
                  </div>
                </TableCell>
                <TableCell>
                  <RolePermissionsDialog
                    role={r}
                    allPermissions={permissions}
                    trigger={
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-md bg-muted/60 hover:bg-muted hover:text-foreground text-muted-foreground transition-colors cursor-pointer"
                      >
                        <RiKey2Line className="size-3.5 text-primary" />
                        <span>
                          <strong className="text-foreground">{permCount}</strong> permissions
                        </span>
                      </button>
                    }
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {/* Direct Permissions Checkbox Modal */}
                    <RolePermissionsDialog
                      role={r}
                      allPermissions={permissions}
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Manage Permissions"
                          className="size-8 text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <RiKey2Line className="size-4" />
                        </Button>
                      }
                    />

                    {/* Edit Role Details */}
                    <EditRoleDialog role={r} />

                    {/* Delete Role (Disabled if isSystem) */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:hover:bg-transparent"
                      disabled={r.isSystem || loadingId === r.id}
                      title={r.isSystem ? "System role cannot be deleted" : "Delete Role"}
                      onClick={() => handleDelete(r.id, r.code)}
                    >
                      <RiDeleteBinLine className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
