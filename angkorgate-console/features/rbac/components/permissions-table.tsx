"use client"

import { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  RiKey2Line,
  RiSearchLine,
  RiFilterLine,
  RiShieldCheckLine,
} from "@remixicon/react"
import type { Permission, Role } from "../types/rbac.types"
import { PermissionDetailsDialog } from "./permission-details-dialog"

interface PermissionsTableProps {
  permissions: Permission[]
  roles: Role[]
}

export function PermissionsTable({ permissions, roles }: PermissionsTableProps) {
  const [search, setSearch] = useState("")
  const [selectedResource, setSelectedResource] = useState<string>("all")

  // Extract distinct resource categories
  const resources = useMemo(() => {
    const list = Array.from(new Set(permissions.map((p) => p.resource))).sort()
    return ["all", ...list]
  }, [permissions])

  // Map each permission code to the roles that include it
  const permissionRolesMap = useMemo(() => {
    const map = new Map<string, Role[]>()
    for (const r of roles) {
      if (!r.permissions) continue
      for (const code of r.permissions) {
        if (!map.has(code)) map.set(code, [])
        map.get(code)!.push(r)
      }
    }
    return map
  }, [roles])

  // Filtered permissions
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return permissions.filter((p) => {
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
  }, [permissions, search, selectedResource])

  // Helper for action badge coloring
  const getActionBadgeClass = (action: string) => {
    switch (action.toLowerCase()) {
      case "read":
        return "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20"
      case "write":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
      case "delete":
        return "bg-destructive/10 text-destructive border-destructive/20"
      case "manage":
      case "admin":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <RiSearchLine className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search permissions by code, resource, action, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 font-mono text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <RiFilterLine className="size-4 text-muted-foreground shrink-0 ml-1 mr-0.5" />
          {resources.map((res) => (
            <button
              key={res}
              type="button"
              onClick={() => setSelectedResource(res)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono whitespace-nowrap transition-colors ${
                selectedResource === res
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {res === "all" ? `All (${permissions.length})` : res}
            </button>
          ))}
        </div>
      </div>

      {/* Permissions Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-12 text-center bg-card">
          <RiKey2Line className="size-10 text-muted-foreground/60 mb-3" />
          <h3 className="font-heading text-base font-semibold">No Permissions Found</h3>
          <p className="font-mono text-xs text-muted-foreground max-w-sm mt-1">
            No permissions matched your current search or resource filter.
          </p>
          {(search || selectedResource !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("")
                setSelectedResource("all")
              }}
              className="mt-4 font-mono text-xs"
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-mono text-xs">Permission Code</TableHead>
                <TableHead className="font-mono text-xs">Resource</TableHead>
                <TableHead className="font-mono text-xs">Action</TableHead>
                <TableHead className="font-mono text-xs">Description</TableHead>
                <TableHead className="font-mono text-xs">Assigned Roles</TableHead>
                <TableHead className="font-mono text-xs text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const grantingRoles = permissionRolesMap.get(p.code) || []
                return (
                  <TableRow key={p.id || p.code} className="font-mono text-xs hover:bg-muted/20">
                    <TableCell className="font-semibold text-foreground">
                      <Badge variant="outline" className="font-mono text-xs">
                        {p.code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-foreground font-medium">
                        {p.resource}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`font-mono text-[10px] uppercase font-semibold ${getActionBadgeClass(
                          p.action
                        )}`}
                      >
                        {p.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span className="font-sans text-xs text-muted-foreground line-clamp-1">
                        {p.description || `Allows ${p.action} on ${p.resource}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1 max-w-xs">
                        {grantingRoles.length === 0 ? (
                          <span className="text-[11px] text-muted-foreground/60 italic">
                            Unassigned
                          </span>
                        ) : (
                          grantingRoles.slice(0, 3).map((r) => (
                            <Badge
                              key={r.id}
                              variant="secondary"
                              className="font-mono text-[10px] px-1.5 py-0"
                            >
                              {r.code}
                            </Badge>
                          ))
                        )}
                        {grantingRoles.length > 3 && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            +{grantingRoles.length - 3} more
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <PermissionDetailsDialog permission={p} roles={roles} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
