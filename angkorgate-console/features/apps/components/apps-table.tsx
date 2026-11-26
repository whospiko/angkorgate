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
  RiShieldKeyholeLine,
  RiGlobalLine,
  RiEyeLine,
} from "@remixicon/react"
import type { AppSetting } from "../types/apps.types"
import type { Scope } from "@/features/scopes"
import { deleteAppAction, regenerateSecretAction, toggleAppFeatureAction } from "../server/apps-actions"
import { ClientDetailSheet } from "./client-detail-sheet"
import { SecretDisplayField } from "@/components/secret-field"

interface AppsTableProps {
  apps: AppSetting[]
  availableScopes?: Scope[]
}

export function AppsTable({ apps, availableScopes = [] }: AppsTableProps) {
  const [selectedApp, setSelectedApp] = useState<AppSetting | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [loadingCode, setLoadingCode] = useState<string | null>(null)
  const [revealedSecret, setRevealedSecret] = useState<{ [code: string]: string }>({})

  const handleOpenDetails = (app: AppSetting) => {
    setSelectedApp(app)
    setSheetOpen(true)
  }

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
    if (!confirm(`Regenerate client secret for "${code}"? This will activate a 24-hour grace window.`)) return
    setLoadingCode(code)
    try {
      const res = await regenerateSecretAction(code, 24)
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
    <>
      <div className="rounded-lg border border-border/50 bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-mono text-xs">Client ID</TableHead>
              <TableHead className="font-mono text-xs">Name</TableHead>
              <TableHead className="font-mono text-xs">Client Type</TableHead>
              <TableHead className="font-mono text-xs">Flows & Capabilities</TableHead>
              <TableHead className="font-mono text-xs">Scopes</TableHead>
              <TableHead className="font-mono text-xs">Redirect URIs</TableHead>
              <TableHead className="font-mono text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apps.map((app) => {
              const redirectCount = (app.validRedirectUris || app.allowedRedirectUrls || []).length
              const scopesCount = app.allowedScopes ? app.allowedScopes.length : 0

              return (
                <TableRow
                  key={app.appCode}
                  className="font-mono text-xs hover:bg-muted/40 cursor-pointer"
                  onClick={() => handleOpenDetails(app)}
                >
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
                      <div className="mt-1.5 max-w-[260px]" onClick={(e) => e.stopPropagation()}>
                        <SecretDisplayField
                          value={revealedSecret[app.appCode]}
                          maskedDots={20}
                          requireStepUp={true}
                          copyable={true}
                        />
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    {app.isPublicClient ? (
                      <Badge variant="secondary" className="font-mono text-[10px] gap-1">
                        <RiGlobalLine className="size-3 text-emerald-500" /> Public SPA
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="font-mono text-[10px] gap-1">
                        <RiShieldKeyholeLine className="size-3 text-primary" /> Confidential
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1 flex-wrap">
                      {app.standardFlowEnabled && (
                        <Badge variant="secondary" className="text-[10px] py-0">
                          Auth Code
                        </Badge>
                      )}
                      {app.requirePkce && (
                        <Badge variant="secondary" className="text-[10px] py-0">
                          PKCE
                        </Badge>
                      )}
                      {app.serviceAccountsEnabled && (
                        <Badge variant="outline" className="text-[10px] py-0 text-primary border-primary/40">
                          M2M
                        </Badge>
                      )}
                      {app.directAccessGrantsEnabled && (
                        <Badge variant="outline" className="text-[10px] py-0">
                          Password
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {scopesCount > 0 ? `${scopesCount} scopes` : "Default"}
                    </Badge>
                  </TableCell>

                  <TableCell className="max-w-[180px] truncate text-muted-foreground text-[11px]">
                    {(app.validRedirectUris || app.allowedRedirectUrls || [])[0] || "None"}
                    {redirectCount > 1 && ` (+${redirectCount - 1} more)`}
                  </TableCell>

                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            disabled={loadingCode === app.appCode}
                          >
                            <RiMoreLine className="size-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="font-mono text-xs">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Client Options</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleOpenDetails(app)}>
                            <RiEyeLine className="mr-2 size-4" /> Inspect & Edit
                          </DropdownMenuItem>
                          {!app.isPublicClient && (
                            <DropdownMenuItem onClick={() => handleRegenerate(app.appCode)}>
                              <RiRefreshLine className="mr-2 size-4" /> Rotate Secret
                            </DropdownMenuItem>
                          )}
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
                            <RiDeleteBinLine className="mr-2 size-4" /> Delete Client
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <ClientDetailSheet
        app={selectedApp}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        availableScopes={availableScopes}
      />
    </>
  )
}
