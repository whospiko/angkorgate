"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { SearchForm } from "@/components/search-form"
import { CommandPaletteHelpButton } from "@/features/command-palette"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useSidebar } from "@/components/ui/sidebar"
import { RiLayoutLeftLine } from "@remixicon/react"

const routeTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/apps": "Client Applications",
  "/users": "User Accounts",
  "/rbac": "Roles & Permissions",
  "/oauth-providers": "OAuth Identity Providers",
  "/audit": "Audit Logs",
  "/customers": "Customer Directory",
  "/employees": "Organization & Staff",
  "/api-keys": "API Keys & Integrations",
  "/settings/content": "Content Management",
  "/settings/environment": "Environment & Providers",
  "/settings/dev-inbox": "Dev Outbox",
  "/system/health": "Core API Health",
  "/system/cache": "Cache Metrics",
  "/api-explorer": "Swagger API Explorer",
  "/oidc": "OpenID Connect Discovery",
  "/oidc/discovery": "OpenID Discovery",
}

export function SiteHeader() {
  const { toggleSidebar } = useSidebar()
  const pathname = usePathname()
  const pageTitle = routeTitles[pathname] || "Console"

  return (
    <header className="sticky top-0 z-50 flex w-full items-center border-b bg-background">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <Button
          className="h-8 w-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <RiLayoutLeftLine className="size-4" />
        </Button>
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList className="font-mono text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/dashboard" />}>Console</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex w-full items-center gap-1.5 sm:ml-auto sm:w-auto">
          <SearchForm className="flex-1 sm:flex-initial" />
          <CommandPaletteHelpButton />
        </div>
      </div>
    </header>
  )
}
