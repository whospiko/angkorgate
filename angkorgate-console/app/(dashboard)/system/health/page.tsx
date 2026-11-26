import { Metadata } from "next"
import {
  CoreHealthView,
  getCacheStatus,
  getMaintenanceModeAction,
  getSystemHealth,
} from "@/features/system"
import { getPublicCoreUrl } from "@/lib/env"

export const metadata: Metadata = {
  title: "Core API Health - AngkorGate",
  description: "Live operational telemetry and readiness probe for AngkorGate Core.",
}

export const dynamic = "force-dynamic"

export default async function CoreHealthPage() {
  const [health, cache, maintenance] = await Promise.all([
    getSystemHealth(),
    getCacheStatus(),
    getMaintenanceModeAction(),
  ])

  return (
    <CoreHealthView
      health={health}
      cache={cache}
      initialMaintenanceMode={maintenance.maintenanceMode}
      coreApiUrl={getPublicCoreUrl()}
    />
  )
}
