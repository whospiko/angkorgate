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
  RiKey2Line,
  RiDeleteBinLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiRefreshLine,
} from "@remixicon/react"
import type { AppSetting } from "../types/apps.types"
import { deleteAppAction, regenerateSecretAction, toggleAppFeatureAction } from "../server/apps-actions"

interface AppsTableProps {
  apps: AppSetting[]
}

export function AppsTable({ apps }: AppsTableProps) {
  const [loadingCode, setLoadingCode] = useState<string | null>(null)
  const [revealedSecret, setRevealedSecret] = useState<{ [code: string]: string }>({})

  const handleDelete = async (code: string) => {
    if (!confirm(`Are you sure you want to delete client app "${code}"?`)) return
    setLoadingCode(code)
    try {
      await deleteAppAction(code)
    } finally {
      setLoadingCode(null)
    }
  }

  const handleRegenerate = async (code: string) => {
    if (!confirm(`Regenerate client secret for "${code}"? This will invalidate existing secrets.`)) return
    setLoadingCode(code)
    try {
      const res = await regenerateSecretAction(code)
      if (res.success && res.clientSecret) {
        setRevealedSecret((prev) => ({ ...prev, [code]: res.clientSecret! }))
      }
    } finally {
      setLoadingCode(null)
    }
  }

  const handleToggle = async (
    code: string,
    field: "passwordLogin" | "oauth" | "registration",
    currentVal: boolean
  ) => {
    setLoadingCode(code)
    try {
      await toggleAppFeatureAction(code, field, !currentVal)
    } finally {
      setLoadingCode(null)
    }
  }

  if (apps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-12 text-center bg-card">
        <RiKey2Line className="size-10 text-muted-foreground/60 mb-3" />
        <h3 className="font-heading text-base font-semibold">No Registered Applications</h3>
        <p className="font-mono text-xs text-muted-foreground max-w-sm mt-1">
          No client applications registered in AngkorGate Core yet. Create your first OIDC app to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="font-mono text-xs">App Code</TableHead>
            <TableHead className="font-mono text-xs">Name</TableHead>
            <TableHead className="font-mono text-xs">Auth Methods</TableHead>
            <TableHead className="font-mono text-xs">OAuth Providers</TableHead>
            <TableHead className="font-mono text-xs">Redirect URIs</TableHead>
            <TableHead className="font-mono text-xs text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apps.map((app) => (
            <TableRow key={app.appCode} className="font-mono text-xs">
              <TableCell className="font-semibold text-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-mono px-2 py-0.5 rounded bg-muted text-xs border border-border/40">
                    {app.appCode}
                  </span>
                </div>
              </TableCell>
              <TableCell className="font-sans font-medium text-sm">
                {app.name}
                {revealedSecret[app.appCode] && (
                  <div className="font-mono text-[11px] text-primary mt-1 p-1 rounded bg-primary/10 border border-primary/20">
                    New Secret: {revealedSecret[app.appCode]}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge
                    variant={app.passwordLoginEnabled ? "outline" : "secondary"}
                    className="cursor-pointer select-none"
                    onClick={() => handleToggle(app.appCode, "passwordLogin", app.passwordLoginEnabled)}
                  >
                    Password: {app.passwordLoginEnabled ? "ON" : "OFF"}
                  </Badge>
                  <Badge
                    variant={app.registrationEnabled ? "outline" : "secondary"}
                    className="cursor-pointer select-none"
                    onClick={() => handleToggle(app.appCode, "registration", app.registrationEnabled)}
                  >
                    Reg: {app.registrationEnabled ? "ON" : "OFF"}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                {app.oauthEnabled && app.enabledProviders && app.enabledProviders.length > 0 ? (
                  <div className="flex gap-1 flex-wrap">
                    {app.enabledProviders.map((p) => (
                      <Badge key={p} variant="secondary" className="capitalize text-[10px]">
                        {p}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">Disabled</span>
                )}
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-muted-foreground text-[11px]">
                {app.allowedRedirectUrls?.join(", ") || "None"}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon" className="size-8" disabled={loadingCode === app.appCode}>
                        <RiMoreLine className="size-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="font-mono text-xs">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Client Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleRegenerate(app.appCode)}>
                        <RiRefreshLine className="mr-2 size-4" /> Regenerate Secret
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggle(app.appCode, "oauth", app.oauthEnabled)}
                      >
                        {app.oauthEnabled ? (
                          <>
                            <RiCloseCircleLine className="mr-2 size-4 text-destructive" /> Disable OAuth
                          </>
                        ) : (
                          <>
                            <RiCheckboxCircleLine className="mr-2 size-4 text-emerald-600" /> Enable OAuth
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        onClick={() => handleDelete(app.appCode)}
                        className="text-destructive focus:text-destructive"
                      >
                        <RiDeleteBinLine className="mr-2 size-4" /> Delete App
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
