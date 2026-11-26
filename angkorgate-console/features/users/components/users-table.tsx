"use client"

import { useState } from "react"
import Link from "next/link"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  RiMoreLine,
  RiUserLine,
  RiLockUnlockLine,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiEyeLine,
  RiLockPasswordLine,
} from "@remixicon/react"
import { OAuthProviderIcon } from "@/components/oauth-provider-icon"
import type { User } from "../types/users.types"
import { toggleUserStatusAction, unlockUserAction, deleteUserAction } from "../server/users-actions"

interface UsersTableProps {
  users: User[]
}

export function UsersTable({ users }: UsersTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleToggle = async (userId: string, currentActive: boolean) => {
    setLoadingId(userId)
    try {
      await toggleUserStatusAction(userId, !currentActive)
    } finally {
      setLoadingId(null)
    }
  }

  const handleUnlock = async (userId: string) => {
    setLoadingId(userId)
    try {
      await unlockUserAction(userId)
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete user "${email}"?`)) return
    setLoadingId(userId)
    try {
      await deleteUserAction(userId)
    } finally {
      setLoadingId(null)
    }
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-12 text-center bg-card">
        <RiUserLine className="size-10 text-muted-foreground/60 mb-3" />
        <h3 className="font-heading text-base font-semibold">No Users Found</h3>
        <p className="font-mono text-xs text-muted-foreground max-w-sm mt-1">
          No users registered in AngkorGate Core or matched your search.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="font-mono text-xs">Email / User ID</TableHead>
            <TableHead className="font-mono text-xs">Sign-In Method</TableHead>
            <TableHead className="font-mono text-xs">Status</TableHead>
            <TableHead className="font-mono text-xs">Email Verified</TableHead>
            <TableHead className="font-mono text-xs">Assigned Roles</TableHead>
            <TableHead className="font-mono text-xs text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id} className="font-mono text-xs">
              <TableCell>
                <Link
                  href={`/users/${u.id}`}
                  className="font-sans font-medium text-sm text-foreground hover:text-primary hover:underline transition-colors block"
                >
                  {u.fullName || u.email || u.phone || "Unnamed User"}
                </Link>
                <div className="font-mono text-[11px] text-muted-foreground truncate max-w-[220px]">
                  {u.fullName && (u.email || u.phone) ? (u.email || u.phone) : u.id}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {u.oauthProviders && u.oauthProviders.length > 0 ? (
                    u.oauthProviders.map((provider) => (
                      <Badge
                        key={provider}
                        variant="outline"
                        className="font-mono text-[10px] gap-1 capitalize"
                      >
                        <OAuthProviderIcon code={provider} className="size-3" />
                        {provider}
                      </Badge>
                    ))
                  ) : (
                    <Badge
                      variant="secondary"
                      className="font-mono text-[10px] gap-1 text-muted-foreground"
                    >
                      <RiLockPasswordLine className="size-3" />
                      Password
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={u.isActive ? "outline" : "secondary"}
                  className="font-mono text-[11px] gap-1 cursor-pointer select-none"
                  onClick={() => handleToggle(u.id, u.isActive)}
                >
                  <span
                    className={`size-1.5 rounded-full inline-block ${
                      u.isActive ? "bg-emerald-500" : "bg-muted-foreground"
                    }`}
                  />
                  {u.isActive ? "Active" : "Deactivated"}
                </Badge>
              </TableCell>
              <TableCell>
                {u.isEmailVerified ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                    <RiCheckLine className="size-3.5" /> Verified
                  </span>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-1 font-mono text-[11px]">
                    <RiCloseLine className="size-3.5" /> Unverified
                  </span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {u.roles && u.roles.length > 0 ? (
                    u.roles.map((r) => (
                      <Badge key={r} variant="outline" className="text-[10px]">
                        {r}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      CUSTOMER
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 font-mono text-xs"
                    render={<Link href={`/users/${u.id}`} />}
                  >
                    <RiEyeLine className="size-3.5" />
                    <span>View</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon" className="size-8" disabled={loadingId === u.id}>
                          <RiMoreLine className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end" className="font-mono text-xs">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem render={<Link href={`/users/${u.id}`} />}>
                          <RiEyeLine className="mr-2 size-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggle(u.id, u.isActive)}>
                          {u.isActive ? "Deactivate User" : "Activate User"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUnlock(u.id)}>
                          <RiLockUnlockLine className="mr-2 size-4" /> Reset Failed Attempts
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          onClick={() => handleDelete(u.id, u.email || u.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <RiDeleteBinLine className="mr-2 size-4" /> Delete Account
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
