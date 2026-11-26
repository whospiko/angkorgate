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
import { Switch } from "@/components/ui/switch"
import {
  RiDeleteBinLine,
  RiEditLine,
  RiShieldUserLine,
} from "@remixicon/react"
import type { OAuthProvider } from "../types/oauth-providers.types"
import {
  deleteOAuthProviderAction,
  toggleOAuthProviderAction,
} from "../server/oauth-providers-actions"
import { OAuthProviderIcon } from "./provider-icon"
import { EditOAuthProviderDialog } from "./edit-oauth-provider-dialog"

interface OAuthProvidersTableProps {
  providers: OAuthProvider[]
  callbackBaseUrl?: string | null
}

export function OAuthProvidersTable({
  providers,
  callbackBaseUrl,
}: OAuthProvidersTableProps) {
  const [loadingCode, setLoadingCode] = useState<string | null>(null)
  const [editingProvider, setEditingProvider] = useState<OAuthProvider | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const handleToggle = async (code: string) => {
    setLoadingCode(code)
    setActionError(null)
    try {
      const res = await toggleOAuthProviderAction(code)
      if (!res.success && res.message) {
        setActionError(res.message)
      }
    } finally {
      setLoadingCode(null)
    }
  }

  const handleDelete = async (code: string) => {
    if (!confirm(`Delete OAuth provider "${code}"?`)) return
    setLoadingCode(code)
    setActionError(null)
    try {
      const res = await deleteOAuthProviderAction(code)
      if (!res.success && res.message) {
        setActionError(res.message)
      }
    } finally {
      setLoadingCode(null)
    }
  }

  if (providers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-12 text-center bg-card">
        <RiShieldUserLine className="size-10 text-muted-foreground/60 mb-3" />
        <h3 className="font-heading text-base font-semibold">
          No OAuth Providers Configured
        </h3>
        <p className="font-mono text-xs text-muted-foreground max-w-sm mt-1">
          Configure external identity providers like Google, GitHub, Discord, Microsoft Entra ID, or Telegram to enable social sign-in.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {actionError && (
        <div className="font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/20">
          {actionError}
        </div>
      )}

      <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-mono text-xs">Provider</TableHead>
              <TableHead className="font-mono text-xs">Display Name</TableHead>
              <TableHead className="font-mono text-xs">Enabled</TableHead>
              <TableHead className="font-mono text-xs">Client ID / Bot</TableHead>
              <TableHead className="font-mono text-xs">Requested Scopes</TableHead>
              <TableHead className="font-mono text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.map((p) => (
              <TableRow key={p.code} className="font-mono text-xs">
                <TableCell className="font-semibold text-foreground uppercase">
                  <Badge variant="outline" className="font-mono text-xs gap-1.5">
                    <OAuthProviderIcon code={p.code} className="size-3.5" />
                    {p.code}
                  </Badge>
                </TableCell>
                <TableCell className="font-sans font-medium text-sm text-foreground">
                  <div className="flex items-center gap-2">
                    <span>{p.name}</span>
                    {p.code === "microsoft" && typeof p.extraConfig?.tenantId === "string" && (
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        tenant: {p.extraConfig.tenantId}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Switch
                      checked={p.isActive}
                      disabled={loadingCode === p.code}
                      onCheckedChange={() => handleToggle(p.code)}
                      aria-label={`Toggle ${p.name}`}
                    />
                    <Badge
                      variant={p.isActive ? "outline" : "secondary"}
                      className="font-mono text-[11px] gap-1"
                    >
                      <span
                        className={`size-1.5 rounded-full inline-block ${
                          p.isActive ? "bg-emerald-500" : "bg-muted-foreground"
                        }`}
                      />
                      {p.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground text-[11px]">
                  {p.clientId}
                </TableCell>
                <TableCell className="text-muted-foreground text-[11px]">
                  {p.code === "telegram"
                    ? "HMAC-SHA256 Widget"
                    : p.scopes || "default"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={loadingCode === p.code}
                      onClick={() => setEditingProvider(p)}
                      title={`Edit ${p.name}`}
                    >
                      <RiEditLine className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      disabled={loadingCode === p.code}
                      onClick={() => handleDelete(p.code)}
                      title={`Delete ${p.name}`}
                    >
                      <RiDeleteBinLine className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingProvider && (
        <EditOAuthProviderDialog
          key={editingProvider.code}
          provider={editingProvider}
          callbackBaseUrl={callbackBaseUrl}
          open={Boolean(editingProvider)}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditingProvider(null)
          }}
        />
      )}
    </div>
  )
}
