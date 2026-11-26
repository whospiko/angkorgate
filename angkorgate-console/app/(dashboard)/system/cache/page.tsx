import { Metadata } from "next"
import { CacheMetricsView, getCacheStatus } from "@/features/system"

export const metadata: Metadata = {
  title: "Cache Metrics - AngkorGate",
  description: "Inspect Redis and in-memory cache status, prefixes, and purge cache.",
}

export const dynamic = "force-dynamic"

export default async function CacheMetricsPage() {
  const cache = await getCacheStatus()

  return <CacheMetricsView cache={cache} />
}
