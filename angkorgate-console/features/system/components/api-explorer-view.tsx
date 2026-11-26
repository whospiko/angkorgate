"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCheckLine,
  RiCodeSSlashLine,
  RiExternalLinkLine,
  RiFileCopyLine,
  RiLockLine,
  RiSearchLine,
  RiTerminalBoxLine,
} from "@remixicon/react"
import type { OpenApiOperation, OpenApiSpec } from "../types/system.types"

interface EndpointRow {
  id: string
  method: string
  path: string
  tag: string
  operation: OpenApiOperation
}

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const

function methodBadgeClass(method: string): string {
  switch (method.toUpperCase()) {
    case "GET":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
    case "POST":
      return "border-primary/40 bg-primary/15 text-primary"
    case "PATCH":
    case "PUT":
      return "border-amber-500/40 bg-amber-500/10 text-amber-500"
    case "DELETE":
      return "border-rose-500/40 bg-rose-500/10 text-rose-500"
    default:
      return "border-border bg-muted text-muted-foreground"
  }
}

export function ApiExplorerView({
  spec,
  coreApiUrl,
}: {
  spec: OpenApiSpec | null
  coreApiUrl: string
}) {
  const [search, setSearch] = React.useState("")
  const [selectedTag, setSelectedTag] = React.useState<string>("ALL")
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  const [showRaw, setShowRaw] = React.useState(false)

  const endpoints = React.useMemo<EndpointRow[]>(() => {
    if (!spec?.paths) return []
    const rows: EndpointRow[] = []
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      for (const method of HTTP_METHODS) {
        const op = pathItem[method]
        if (!op) continue
        const tag = op.tags?.[0] || "General"
        rows.push({
          id: `${method.toUpperCase()} ${path}`,
          method: method.toUpperCase(),
          path,
          tag,
          operation: op,
        })
      }
    }
    return rows
  }, [spec])

  const tags = React.useMemo(() => {
    const set = new Set<string>()
    for (const ep of endpoints) set.add(ep.tag)
    return Array.from(set).sort()
  }, [endpoints])

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return endpoints.filter((ep) => {
      if (selectedTag !== "ALL" && ep.tag !== selectedTag) return false
      if (!q) return true
      return (
        ep.path.toLowerCase().includes(q) ||
        ep.method.toLowerCase().includes(q) ||
        ep.tag.toLowerCase().includes(q) ||
        (ep.operation.summary?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [endpoints, search, selectedTag])

  const copyCurl = async (ep: EndpointRow) => {
    const requiresAuth = (ep.operation.security?.length ?? 0) > 0
    const authHeader = requiresAuth
      ? ` \\\n  -H "Authorization: Bearer <ACCESS_TOKEN>"`
      : ""
    const cmd = `curl -X ${ep.method} "${coreApiUrl}${ep.path}"${authHeader}`
    await navigator.clipboard.writeText(cmd)
    setCopiedId(ep.id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              {spec?.info?.title || "Swagger API Explorer"}
            </h1>
            {spec?.info?.version && (
              <Badge variant="secondary" className="font-mono text-xs">
                v{spec.info.version}
              </Badge>
            )}
            {spec?.openapi && (
              <Badge variant="outline" className="font-mono text-xs">
                OpenAPI {spec.openapi}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            {spec?.info?.description ||
              "Interactive OpenAPI endpoint catalog served inside AngkorGate Console."}
          </p>
        </div>

        <a
          href={`${coreApiUrl}/api`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 font-mono text-xs text-foreground hover:bg-muted/60 transition-colors shrink-0"
        >
          <RiExternalLinkLine className="size-3.5" />
          Open Standalone Swagger
        </a>
      </div>

      {!spec ? (
        <Card className="border border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              OpenAPI Specification Unavailable
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              Could not reach <code>{coreApiUrl}/api-json</code>. Ensure{" "}
              <code>angkorgate-core</code> is running.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {/* Filter & Search Bar */}
          <Card className="border border-border/50 bg-card">
            <CardContent className="pt-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <RiSearchLine className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter endpoints by path, method, tag, or summary..."
                    className="pl-8 font-mono text-xs"
                  />
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  Showing {filtered.length} of {endpoints.length} endpoints
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={selectedTag === "ALL" ? "default" : "outline"}
                  onClick={() => setSelectedTag("ALL")}
                  className="h-7 px-2.5 font-mono text-[11px]"
                >
                  All ({endpoints.length})
                </Button>
                {tags.map((tag) => (
                  <Button
                    key={tag}
                    type="button"
                    size="sm"
                    variant={selectedTag === tag ? "default" : "outline"}
                    onClick={() => setSelectedTag(tag)}
                    className="h-7 px-2.5 font-mono text-[11px]"
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Endpoints List */}
          <div className="space-y-2">
            {filtered.map((ep) => {
              const isOpen = expandedId === ep.id
              const requiresAuth = (ep.operation.security?.length ?? 0) > 0
              return (
                <Card
                  key={ep.id}
                  className="border border-border/50 bg-card overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : ep.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                  >
                    {isOpen ? (
                      <RiArrowDownSLine className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <RiArrowRightSLine className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <Badge
                      variant="outline"
                      className={`w-16 justify-center font-mono text-[11px] font-bold shrink-0 ${methodBadgeClass(
                        ep.method
                      )}`}
                    >
                      {ep.method}
                    </Badge>
                    <code className="font-mono text-xs font-semibold text-foreground truncate">
                      {ep.path}
                    </code>
                    <span className="hidden md:inline font-mono text-xs text-muted-foreground truncate flex-1">
                      {ep.operation.summary}
                    </span>
                    <div className="ml-auto flex items-center gap-2 shrink-0">
                      {requiresAuth && (
                        <RiLockLine
                          className="size-3.5 text-amber-500"
                          aria-label="Requires authentication"
                        />
                      )}
                      <Badge
                        variant="secondary"
                        className="font-mono text-[10px]"
                      >
                        {ep.tag}
                      </Badge>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-border/50 bg-muted/20 px-4 py-3 space-y-3 font-mono text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="text-muted-foreground">
                          {ep.operation.description ||
                            ep.operation.summary ||
                            "No additional description."}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void copyCurl(ep)}
                          className="h-7 gap-1.5 font-mono text-[11px] shrink-0"
                        >
                          {copiedId === ep.id ? (
                            <>
                              <RiCheckLine className="size-3.5 text-emerald-500" />
                              Copied cURL
                            </>
                          ) : (
                            <>
                              <RiFileCopyLine className="size-3.5" />
                              Copy cURL
                            </>
                          )}
                        </Button>
                      </div>

                      {ep.operation.parameters &&
                        ep.operation.parameters.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                              Parameters
                            </div>
                            <div className="grid gap-1.5 sm:grid-cols-2">
                              {ep.operation.parameters.map((p) => (
                                <div
                                  key={`${p.in}-${p.name}`}
                                  className="flex items-center justify-between rounded-md border border-border/50 bg-background px-2.5 py-1.5"
                                >
                                  <span>
                                    <code className="font-semibold text-foreground">
                                      {p.name}
                                    </code>{" "}
                                    <span className="text-muted-foreground">
                                      ({p.in})
                                    </span>
                                  </span>
                                  <Badge
                                    variant={p.required ? "default" : "outline"}
                                    className="text-[10px]"
                                  >
                                    {p.required ? "required" : "optional"}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {ep.operation.responses && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-1">
                            Responses:
                          </span>
                          {Object.entries(ep.operation.responses).map(
                            ([code, meta]) => (
                              <Badge
                                key={code}
                                variant="outline"
                                className="text-[10px]"
                                title={meta.description}
                              >
                                {code}
                                {meta.description ? ` · ${meta.description}` : ""}
                              </Badge>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Collapsible Raw OpenAPI JSON */}
          <Card className="border border-border/50 bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="font-heading text-base flex items-center gap-2">
                    <RiCodeSSlashLine className="size-4 text-primary" />
                    Raw OpenAPI JSON
                  </CardTitle>
                  <CardDescription className="font-mono text-xs">
                    <RiTerminalBoxLine className="inline size-3.5 mr-1" />
                    Fetched from <code>{coreApiUrl}/api-json</code>
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRaw((prev) => !prev)}
                  className="font-mono text-xs"
                >
                  {showRaw ? "Hide JSON" : "Inspect JSON"}
                </Button>
              </div>
            </CardHeader>
            {showRaw && (
              <CardContent>
                <pre className="max-h-96 overflow-auto rounded-lg border border-border/60 bg-muted/40 p-4 font-mono text-xs text-foreground">
                  {JSON.stringify(spec, null, 2)}
                </pre>
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
