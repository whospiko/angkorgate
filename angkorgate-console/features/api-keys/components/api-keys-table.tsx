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
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  RiMore2Line,
  RiSearchLine,
  RiKey2Line,
  RiFileCopyLine,
  RiCheckLine,
  RiSettingsLine,
  RiCloseCircleLine,
  RiDeleteBinLine,
  RiShieldCheckLine,
} from "@remixicon/react"
import { revokeApiKeyAction, deleteApiKeyAction } from "../server/api-keys-actions"
import { EditApiKeyDialog } from "./edit-api-key-dialog"
import type { ApiKey, ResourceSchemaMeta } from "../types/api-keys.types"

interface ApiKeysTableProps {
  apiKeys: ApiKey[]
  schemaResources?: ResourceSchemaMeta[]
  onRefresh?: () => void
}

export function ApiKeysTable({
  apiKeys,
  schemaResources = [],
  onRefresh,
}: ApiKeysTableProps) {
  const [search, setSearch] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const filteredKeys = apiKeys.filter((k) => {
    const q = search.toLowerCase()
    return (
      k.name.toLowerCase().includes(q) ||
      k.keyPrefix.toLowerCase().includes(q) ||
      k.lastFour.includes(q) ||
      (k.userEmail && k.userEmail.toLowerCase().includes(q))
    )
  })

  const handleCopyPrefix = (key: ApiKey) => {
    navigator.clipboard.writeText(`${key.keyPrefix}••••••••${key.lastFour}`)
    setCopiedId(key.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleRevoke = async (id: string) => {
    if (confirm("Are you sure you want to revoke this API key immediately? Integration requests using this key will be refused.")) {
      await revokeApiKeyAction(id)
      if (onRefresh) onRefresh()
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to permanently delete this API key?")) {
      await deleteApiKeyAction(id)
      if (onRefresh) onRefresh()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <RiSearchLine className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search API keys by name or prefix..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 font-mono text-xs"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-mono text-xs">Name & Identifier</TableHead>
              <TableHead className="font-mono text-xs">Status</TableHead>
              <TableHead className="font-mono text-xs">Method Policies</TableHead>
              <TableHead className="font-mono text-xs">Field Projections</TableHead>
              <TableHead className="font-mono text-xs">Usage / Handshakes</TableHead>
              <TableHead className="font-mono text-xs">Last Used</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs font-mono">
                  No API keys found. Generate an API key to enable third-party developer integrations.
                </TableCell>
              </TableRow>
            ) : (
              filteredKeys.map((key) => {
                const isCopied = copiedId === key.id

                return (
                  <TableRow key={key.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-heading font-semibold text-sm text-foreground flex items-center gap-1.5">
                          <RiKey2Line className="size-3.5 text-primary" />
                          {key.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                          <span>{key.keyPrefix}••••{key.lastFour}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyPrefix(key)}
                            title="Copy masked identifier"
                            className="hover:text-foreground cursor-pointer"
                          >
                            {isCopied ? (
                              <RiCheckLine className="size-3 text-emerald-400" />
                            ) : (
                              <RiFileCopyLine className="size-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {key.status === "ACTIVE" && (
                        <Badge variant="outline" className="font-mono text-xs gap-1 border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                          <span className="size-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                          Active
                        </Badge>
                      )}
                      {key.status === "REVOKED" && (
                        <Badge variant="outline" className="font-mono text-xs gap-1 border-destructive/40 text-destructive bg-destructive/10">
                          <span className="size-1.5 rounded-full bg-destructive inline-block" />
                          Revoked
                        </Badge>
                      )}
                      {key.status === "EXPIRED" && (
                        <Badge variant="outline" className="font-mono text-xs gap-1 text-muted-foreground">
                          Expired
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {Object.entries(key.allowedMethods || {}).map(([res, methods]) => (
                          <div key={res} className="flex items-center gap-1 text-[11px] font-mono bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                            <span className="text-muted-foreground font-semibold">{res.slice(0, 3)}:</span>
                            {methods.map((m) => (
                              <span
                                key={m}
                                className={`font-semibold ${
                                  m === "GET"
                                    ? "text-emerald-400"
                                    : m === "POST"
                                    ? "text-primary"
                                    : m === "PATCH"
                                    ? "text-amber-400"
                                    : "text-rose-400"
                                }`}
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-0.5 font-mono text-xs">
                        {Object.entries(key.fieldProjections || {}).length === 0 ? (
                          <span className="text-muted-foreground text-[11px]">Full Schema (All)</span>
                        ) : (
                          Object.entries(key.fieldProjections || {}).map(([res, fields]) => (
                            <div key={res} className="text-[11px] text-muted-foreground">
                              <span className="text-foreground font-semibold">{res}:</span>{" "}
                              {fields.length === 0 ? "All" : `${fields.length} fields`}
                            </div>
                          ))
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-xs">
                      <span className="text-foreground font-semibold">
                        {Number(key.totalRequests || 0).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground text-[11px] ml-1">calls</span>
                    </TableCell>

                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {key.lastUsedAt
                        ? new Date(key.lastUsedAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Never"}
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon" className="size-8">
                              <RiMore2Line className="size-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="font-mono text-xs">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingKey(key)
                              setEditOpen(true)
                            }}
                            className="gap-2 cursor-pointer"
                          >
                            <RiSettingsLine className="size-4" />
                            Edit Policy
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleCopyPrefix(key)}
                            className="gap-2 cursor-pointer"
                          >
                            <RiFileCopyLine className="size-4" />
                            Copy Identifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {key.status === "ACTIVE" && (
                            <DropdownMenuItem
                              onClick={() => handleRevoke(key.id)}
                              className="gap-2 text-amber-500 cursor-pointer focus:text-amber-500"
                            >
                              <RiCloseCircleLine className="size-4" />
                              Revoke Key
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDelete(key.id)}
                            className="gap-2 text-destructive cursor-pointer focus:text-destructive"
                          >
                            <RiDeleteBinLine className="size-4" />
                            Delete Key
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <EditApiKeyDialog
        apiKey={editingKey}
        schemaResources={schemaResources}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={onRefresh}
      />
    </div>
  )
}
