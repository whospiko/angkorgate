"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
  RiKey2Line,
  RiShieldCheckLine,
  RiSpeedUpLine,
  RiServerLine,
} from "@remixicon/react"
import type { ApiKey } from "../types/api-keys.types"

interface ApiKeysStatsProps {
  apiKeys: ApiKey[]
}

export function ApiKeysStats({ apiKeys }: ApiKeysStatsProps) {
  const totalKeys = apiKeys.length
  const activeKeys = apiKeys.filter((k) => k.status === "ACTIVE").length
  const totalRequests = apiKeys.reduce(
    (acc, k) => acc + (Number(k.totalRequests) || 0),
    0
  )
  const allResources = new Set<string>()
  apiKeys.forEach((k) => k.allowedResources?.forEach((r) => allResources.add(r)))

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card className="border-border/50 bg-card">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-mono">Active API Keys</p>
            <h3 className="font-heading text-2xl font-bold tracking-tight text-foreground mt-1">
              {activeKeys}
              <span className="text-xs font-normal text-muted-foreground font-mono ml-1.5">
                / {totalKeys} total
              </span>
            </h3>
          </div>
          <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <RiKey2Line className="size-5" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-mono">Total API Handshakes</p>
            <h3 className="font-heading text-2xl font-bold tracking-tight text-foreground mt-1">
              {totalRequests.toLocaleString()}
            </h3>
          </div>
          <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <RiSpeedUpLine className="size-5" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-mono">Protected Modules</p>
            <h3 className="font-heading text-2xl font-bold tracking-tight text-foreground mt-1">
              2
              <span className="text-xs font-normal text-muted-foreground font-mono ml-1.5">
                (Customers, Employees)
              </span>
            </h3>
          </div>
          <div className="size-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <RiServerLine className="size-5" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-mono">Security Model</p>
            <h3 className="font-heading text-base font-bold tracking-tight text-foreground mt-1">
              SHA-256 Hashed
            </h3>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              Zero-Trust One-Time Secret
            </p>
          </div>
          <div className="size-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <RiShieldCheckLine className="size-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
