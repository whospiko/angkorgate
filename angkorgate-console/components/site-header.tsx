"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { SearchForm } from "@/components/search-form"
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
  "/settings/content": "Content Management",
  "/oidc": "OpenID Connect Discovery",
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
        <SearchForm className="w-full sm:ml-auto sm:w-auto" />
      </div>
    </header>
  )
}
