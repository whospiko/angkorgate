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
import { RiShieldUserLine, RiDeleteBinLine } from "@remixicon/react"
import type { OAuthProvider } from "../types/oauth-providers.types"
import { toggleOAuthProviderAction, deleteOAuthProviderAction } from "../server/oauth-providers-actions"

interface OAuthProvidersTableProps {
  providers: OAuthProvider[]
}

export function OAuthProvidersTable({ providers }: OAuthProvidersTableProps) {
  const [loadingCode, setLoadingCode] = useState<string | null>(null)

  const handleToggle = async (code: string) => {
    setLoadingCode(code)
    try {
      await toggleOAuthProviderAction(code)
    } finally {
      setLoadingCode(null)
    }
  }

  const handleDelete = async (code: string) => {
    if (!confirm(`Delete OAuth provider "${code}"?`)) return
    setLoadingCode(code)
    try {
      await deleteOAuthProviderAction(code)
    } finally {
      setLoadingCode(null)
    }
  }

  if (providers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-12 text-center bg-card">
        <RiShieldUserLine className="size-10 text-muted-foreground/60 mb-3" />
        <h3 className="font-heading text-base font-semibold">No OAuth Providers Configured</h3>
        <p className="font-mono text-xs text-muted-foreground max-w-sm mt-1">
          Configure external identity providers like Google or Apple to enable social sign-in.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="font-mono text-xs">Provider</TableHead>
            <TableHead className="font-mono text-xs">Display Name</TableHead>
            <TableHead className="font-mono text-xs">Status</TableHead>
            <TableHead className="font-mono text-xs">Client ID</TableHead>
            <TableHead className="font-mono text-xs">Requested Scopes</TableHead>
            <TableHead className="font-mono text-xs text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {providers.map((p) => (
            <TableRow key={p.code} className="font-mono text-xs">
              <TableCell className="font-semibold text-foreground uppercase">
                <Badge variant="outline" className="font-mono text-xs">
                  {p.code}
                </Badge>
              </TableCell>
              <TableCell className="font-sans font-medium text-sm text-foreground">
                {p.name}
              </TableCell>
              <TableCell>
                <Badge
                  variant={p.isActive ? "outline" : "secondary"}
                  className="font-mono text-[11px] gap-1 cursor-pointer select-none"
                  onClick={() => handleToggle(p.code)}
                >
                  <span
                    className={`size-1.5 rounded-full inline-block ${
                      p.isActive ? "bg-emerald-500" : "bg-muted-foreground"
                    }`}
                  />
                  {p.isActive ? "Active" : "Disabled"}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-muted-foreground text-[11px]">
                {p.clientId}
              </TableCell>
              <TableCell className="text-muted-foreground text-[11px]">
                {p.scopes || "openid email profile"}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  disabled={loadingCode === p.code}
                  onClick={() => handleDelete(p.code)}
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
