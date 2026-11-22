import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RiServerLine, RiDatabase2Line, RiCheckboxCircleLine, RiErrorWarningLine } from "@remixicon/react"
import type { SystemHealth, CacheStatus } from "../types/system.types"

interface SystemStatusCardProps {
  health: SystemHealth
  cache: CacheStatus
}

export function SystemStatusCard({ health, cache }: SystemStatusCardProps) {
  const isHealthy = health.status === "ok" || health.status === "healthy"

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RiServerLine className="size-5 text-primary" />
            <CardTitle className="font-heading text-lg">AngkorGate Core Health</CardTitle>
          </div>
          <Badge
            variant={isHealthy ? "outline" : "destructive"}
            className="font-mono text-xs gap-1.5"
          >
            {isHealthy ? (
              <>
                <RiCheckboxCircleLine className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                Operational
              </>
            ) : (
              <>
                <RiErrorWarningLine className="size-3.5 text-destructive" />
                Degraded
              </>
            )}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Upstream runtime and caching telemetry probe
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 border border-border/40">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <RiDatabase2Line className="size-4" /> Cache Provider
            </span>
            <span className="font-mono font-semibold uppercase">{cache.provider || "memory"}</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 border border-border/40">
            <span className="text-muted-foreground">Cache Status</span>
            <span className="font-medium">
              {cache.connected ? "Connected" : cache.enabled ? "Active" : "In-Memory"}
            </span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 border border-border/40">
            <span className="text-muted-foreground">Cache Prefix</span>
            <span className="font-mono font-semibold">{cache.prefix || "angkorgate:"}</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/40 border border-border/40">
            <span className="text-muted-foreground">Cached Items</span>
            <span className="font-mono font-semibold">{cache.itemCount ?? 0} keys</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
