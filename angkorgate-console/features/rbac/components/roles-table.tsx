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
import { RiShieldKeyholeLine, RiDeleteBinLine } from "@remixicon/react"
import type { Role } from "../types/rbac.types"
import { deleteRoleAction } from "../server/rbac-actions"

interface RolesTableProps {
  roles: Role[]
}

export function RolesTable({ roles }: RolesTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Delete role "${code}"?`)) return
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
            <TableHead className="font-mono text-xs">Permissions Count</TableHead>
            <TableHead className="font-mono text-xs text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((r) => (
            <TableRow key={r.id} className="font-mono text-xs">
              <TableCell className="font-semibold text-foreground">
                <Badge variant="outline" className="font-mono text-xs">
                  {r.code}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="font-sans font-medium text-sm text-foreground">{r.name}</div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  {r.description || "No description provided"}
                </div>
              </TableCell>
              <TableCell>
                <span className="font-mono text-xs text-muted-foreground">
                  {r.permissions?.length ?? 0} permissions
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  disabled={loadingId === r.id}
                  onClick={() => handleDelete(r.id, r.code)}
                >
                  <RiDeleteBinLine className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
