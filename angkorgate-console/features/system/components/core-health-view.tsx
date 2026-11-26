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
  RiCheckboxCircleLine,
  RiCodeSSlashLine,
  RiDatabase2Line,
  RiErrorWarningLine,
  RiLoader4Line,
  RiRefreshLine,
  RiServerLine,
  RiShieldCheckLine,
} from "@remixicon/react"
import type { CacheStatus, SystemHealth } from "../types/system.types"
import { toggleMaintenanceModeAction } from "../server/runtime-config-actions"
import { SystemStatusCard } from "./system-status-card"

interface CoreHealthViewProps {
  health: SystemHealth
  cache: CacheStatus
  initialMaintenanceMode: boolean
  coreApiUrl: string
}

export function CoreHealthView({
  health,
  cache,
  initialMaintenanceMode,
  coreApiUrl,
}: CoreHealthViewProps) {
  const router = useRouter()
  const [refreshing, setRefreshing] = React.useState(false)
  const [maintenanceMode, setMaintenanceMode] = React.useState(
    initialMaintenanceMode
  )
  const [toggling, setToggling] = React.useState(false)
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [showRaw, setShowRaw] = React.useState(false)

  const isHealthy = health.status === "ok" || health.status === "healthy"

  const handleRefresh = () => {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 450)
  }

  const handleToggleMaintenance = async () => {
    setToggling(true)
    setFeedback(null)
    const res = await toggleMaintenanceModeAction(!maintenanceMode)
    setToggling(false)
    if (res.success) {
      setMaintenanceMode(res.maintenanceMode)
      setFeedback({ type: "success", message: res.message })
      router.refresh()
    } else {
      setFeedback({ type: "error", message: res.message })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Core API Health
          </h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            Live operational telemetry and service readiness for{" "}
            <code className="text-foreground">{coreApiUrl}</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleMaintenance}
            disabled={toggling}
            className="font-mono text-xs gap-1.5"
          >
            {toggling ? (
              <RiLoader4Line className="size-3.5 animate-spin" />
            ) : (
              <RiShieldCheckLine className="size-3.5" />
            )}
            {maintenanceMode ? "Disable Maintenance" : "Enable Maintenance"}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="font-mono text-xs gap-1.5"
          >
            <RiRefreshLine
              className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh Probe
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-lg border px-4 py-2.5 font-mono text-xs ${
            feedback.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Top KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/50 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-xs">
              API Status
            </CardDescription>
            <CardTitle className="font-heading text-xl flex items-center gap-2">
              {isHealthy ? (
                <>
                  <RiCheckboxCircleLine className="size-5 text-emerald-500" />
                  Operational
                </>
              ) : (
                <>
                  <RiErrorWarningLine className="size-5 text-destructive" />
                  Degraded
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="font-mono text-xs gap-1.5">
              <span
                className={`size-1.5 rounded-full inline-block ${
                  isHealthy ? "bg-emerald-500" : "bg-destructive"
                }`}
              />
              status: {health.status}
            </Badge>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-xs">
              Cache Backend
            </CardDescription>
            <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
              <RiDatabase2Line className="size-5 text-primary" />
              {cache.provider || "memory"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-mono text-xs text-muted-foreground">
              {cache.connected ? "Redis connected" : "In-memory fallback"}
            </span>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-xs">
              Maintenance Gate
            </CardDescription>
            <CardTitle className="font-heading text-xl">
              {maintenanceMode ? "Paused (503)" : "Normal"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={maintenanceMode ? "destructive" : "secondary"}
              className="font-mono text-xs"
            >
              {maintenanceMode ? "MAINTENANCE ON" : "PUBLIC FLOWS ACTIVE"}
            </Badge>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card">
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-xs">
              Upstream Core
            </CardDescription>
            <CardTitle className="font-heading text-xl flex items-center gap-2">
              <RiServerLine className="size-5 text-primary" />
              NestJS 12
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="font-mono text-xs text-muted-foreground truncate block">
              {coreApiUrl}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Detailed System Status Card */}
      <SystemStatusCard health={health} cache={cache} />

      {/* Collapsible Raw JSON Telemetry */}
      <Card className="border border-border/50 bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <RiCodeSSlashLine className="size-4 text-primary" />
                Raw Health Payload
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                JSON response from <code className="text-foreground">GET /</code>
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
              {JSON.stringify(health, null, 2)}
            </pre>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
