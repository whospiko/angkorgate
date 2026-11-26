"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  RiCheckLine,
  RiCodeSSlashLine,
  RiDatabase2Line,
  RiDeleteBinLine,
  RiErrorWarningLine,
  RiLoader4Line,
  RiRadarLine,
  RiRefreshLine,
} from "@remixicon/react"
import type { CacheStatus } from "../types/system.types"
import { purgeCacheAction } from "../server/runtime-config-actions"

interface CacheMetricsViewProps {
  cache: CacheStatus
}

export function CacheMetricsView({ cache }: CacheMetricsViewProps) {
  const router = useRouter()
  const [refreshing, setRefreshing] = React.useState(false)
  const [purging, setPurging] = React.useState(false)
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [showRaw, setShowRaw] = React.useState(false)

  const handleRefresh = () => {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 450)
  }

  const handlePurge = async () => {
    setPurging(true)
    setFeedback(null)
    const res = await purgeCacheAction()
    setPurging(false)
    setFeedback({
      type: res.success ? "success" : "error",
      message: res.message,
    })
    if (res.success) {
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Cache Metrics
          </h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            Redis & in-memory cache health, key namespace, and live purge controls.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="font-mono text-xs gap-1.5"
          >
            <RiRefreshLine
              className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handlePurge}
            disabled={purging}
            className="font-mono text-xs gap-1.5"
          >
            {purging ? (
              <RiLoader4Line className="size-3.5 animate-spin" />
            ) : (
              <RiDeleteBinLine className="size-3.5" />
            )}
            Purge Cache
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 font-mono text-xs ${
            feedback.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {feedback.type === "success" ? (
            <RiCheckLine className="size-4 shrink-0" />
          ) : (
            <RiErrorWarningLine className="size-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/50 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-xs">
              Active Provider
            </CardDescription>
            <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
              <RiDatabase2Line className="size-5 text-primary" />
              {cache.provider || "memory"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="font-mono text-xs gap-1.5">
              <span
                className={`size-1.5 rounded-full inline-block ${
                  cache.connected || cache.enabled
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                }`}
              />
              {cache.connected ? "Connected" : "Local Store"}
            </Badge>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-xs">
              Cache Engine
            </CardDescription>
            <CardTitle className="font-heading text-xl">
              {cache.enabled ? "Enabled" : "Disabled"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-mono text-xs text-muted-foreground">
              {cache.enabled
                ? "Read/write caching active"
                : "Passthrough mode"}
            </span>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-xs">
              Key Prefix
            </CardDescription>
            <CardTitle className="font-heading text-xl font-mono">
              {cache.prefix || "angkorgate:"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-mono text-xs text-muted-foreground">
              Namespace isolation
            </span>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-xs">
              Cached Entries
            </CardDescription>
            <CardTitle className="font-heading text-xl flex items-center gap-2">
              <RiRadarLine className="size-5 text-primary" />
              {cache.itemCount !== undefined ? `${cache.itemCount}` : "Redis"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-mono text-xs text-muted-foreground">
              {cache.itemCount !== undefined
                ? "In-memory keys tracked"
                : "Managed externally by Redis"}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Operational Info */}
      <Card className="border border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="font-heading text-base">
            What Gets Flushed on Purge
          </CardTitle>
          <CardDescription className="font-mono text-xs">
            Purging clears all keys under{" "}
            <code className="text-foreground">{cache.prefix || "angkorgate:"}*</code>{" "}
            across Redis and the local fallback map, and logs{" "}
            <code className="text-foreground">system.cache.purged</code> to Audit Logs.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3 font-mono text-xs">
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
            <div className="font-semibold text-foreground">RBAC & Roles</div>
            <p className="text-muted-foreground mt-1">
              Cached role-permission lookups and overrides
            </p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
            <div className="font-semibold text-foreground">App & OAuth Config</div>
            <p className="text-muted-foreground mt-1">
              Client application settings and provider metadata
            </p>
          </div>
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
            <div className="font-semibold text-foreground">Session Lookups</div>
            <p className="text-muted-foreground mt-1">
              Short-lived token introspection and user cache entries
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Collapsible Raw JSON Telemetry */}
      <Card className="border border-border/50 bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <RiCodeSSlashLine className="size-4 text-primary" />
                Raw Cache Payload
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                JSON response from{" "}
                <code className="text-foreground">GET /cache/status</code>
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
            <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/40 p-4 font-mono text-xs text-foreground">
              {JSON.stringify(cache, null, 2)}
            </pre>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
