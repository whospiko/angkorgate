import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  RiServerLine,
  RiKey2Line,
  RiUserLine,
  RiFileList3Line,
  RiArrowRightLine,
  RiShieldCheckLine,
} from "@remixicon/react"
import { getSystemHealth, getCacheStatus, SystemStatusCard } from "@/features/system"
import { getApps } from "@/features/apps"
import { getUsers } from "@/features/users"
import { getAuditLogs } from "@/features/audit"

export const metadata = {
  title: "Console Overview | AngkorGate",
}

export default async function DashboardPage() {
  const [health, cache, apps, usersData, auditData] = await Promise.all([
    getSystemHealth(),
    getCacheStatus(),
    getApps(),
    getUsers({ limit: 5 }),
    getAuditLogs({ limit: 5 }),
  ])

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Console Overview
          </h1>
          <p className="text-xs text-muted-foreground">
            AngkorGate IAM & Gateway Management Console
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs gap-1.5 font-sans">
            <span className="size-2 rounded-full bg-emerald-500 inline-block" />
            API Core: Connected
          </Badge>
          <Button size="sm" render={<Link href="/apps" />}>
            Manage Apps <RiArrowRightLine className="ml-1 size-4" />
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Client Apps
            </CardTitle>
            <RiKey2Line className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-heading text-2xl font-bold">{apps.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered OIDC clients
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Users
            </CardTitle>
            <RiUserLine className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-heading text-2xl font-bold">{usersData.total || usersData.items.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Accounts in database
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Audit Logs
            </CardTitle>
            <RiFileList3Line className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-heading text-2xl font-bold">{auditData.total || auditData.items.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Recorded audit events
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              OIDC Engine
            </CardTitle>
            <RiShieldCheckLine className="size-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="font-heading text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground mt-1">
              RFC 7662 / RFC 7009 compliant
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Status & Theme Specs */}
      <div className="grid gap-6 md:grid-cols-7">
        <div className="md:col-span-4">
          <SystemStatusCard health={health} cache={cache} />
        </div>

        <Card className="md:col-span-3 border border-border/50">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Architecture & Theme</CardTitle>
            <CardDescription className="text-xs">
              Live Discord theme styling & gg sans typography standards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Theme:</span>
                <span className="font-semibold text-primary">Discord (Blurple)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Architecture:</span>
                <span>Feature-Driven (FSD-lite)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Style Foundation:</span>
                <span className="font-semibold text-primary">base-luma</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">API Core URL:</span>
                <span className="font-mono">http://localhost:8080</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Icons:</span>
                <span>@remixicon/react</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Primary Typography:</span>
                <span className="font-semibold">gg sans</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Heading Typography:</span>
                <span className="font-semibold">gg sans</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Monospace / Code:</span>
                <span className="font-mono">JetBrains Mono</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Border Radius:</span>
                <span>0.625rem (10px)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
