"use client"

import * as React from "react"
import Link from "next/link"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  RiDashboardLine,
  RiShieldKeyholeLine,
  RiFileList3Line,
  RiBookOpenLine,
  RiServerLine,
  RiRadarLine,
  RiUserLine,
} from "@remixicon/react"
import { BrandLogo, useBranding } from "@/features/system"
import { getPublicCoreUrl } from "@/lib/env"

const publicCoreUrl = getPublicCoreUrl()

const defaultNavData = {
  navMain: [
    {
      title: "Overview",
      url: "/dashboard",
      icon: <RiDashboardLine className="size-4" />,
      isActive: true,
      items: [
        {
          title: "System & Metrics",
          url: "/dashboard",
        },
      ],
    },
    {
      title: "Identity & Access",
      url: "/apps",
      icon: <RiShieldKeyholeLine className="size-4" />,
      isActive: true,
      items: [
        {
          title: "Client Applications",
          url: "/apps",
        },
        {
          title: "User Accounts",
          url: "/users",
        },
        {
          title: "Roles & Permissions",
          url: "/rbac",
        },
        {
          title: "OAuth Providers",
          url: "/oauth-providers",
        },
        {
          title: "OIDC Discovery & JWKS",
          url: "/oidc",
        },
      ],
    },
    {
      title: "Operations & Branding",
      url: "/audit",
      icon: <RiFileList3Line className="size-4" />,
      isActive: true,
      items: [
        {
          title: "Audit Logs",
          url: "/audit",
        },
        {
          title: "Content Management",
          url: "/settings/content",
        },
        {
          title: "Customers CRM",
          url: "/customers",
        },
        {
          title: "Organization & Staff",
          url: "/employees",
        },
      ],
    },
    {
      title: "API & Docs",
      url: "/docs",
      icon: <RiBookOpenLine className="size-4" />,
      items: [
        {
          title: "API Keys & Integrations",
          url: "/api-keys",
        },
        {
          title: "Documentation",
          url: "/docs",
        },
        {
          title: "Swagger API Explorer",
          url: `${publicCoreUrl}/api#`,
        },
        {
          title: "OpenID Discovery JSON",
          url: `${publicCoreUrl}/oidc/.well-known/openid-configuration`,
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Account Portal",
      url: "/account",
      icon: <RiUserLine className="size-4" />,
    },
    {
      title: "Core API Health",
      url: `${publicCoreUrl}/`,
      icon: <RiServerLine className="size-4" />,
    },
    {
      title: "Cache Metrics",
      url: `${publicCoreUrl}/cache/status`,
      icon: <RiRadarLine className="size-4" />,
    },
  ],
}

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  currentUser?: {
    email: string | null
    roles: string[]
  } | null
}

export function AppSidebar({ currentUser, ...props }: AppSidebarProps) {
  const { branding } = useBranding()
  const appName = branding?.appName || "AngkorGate"
  const logoUrl = branding?.logoUrl

  const displayUser = {
    name: currentUser?.email?.split("@")[0] || "Administrator",
    email: currentUser?.email || "admin@angkorgate.local",
    role: currentUser?.roles?.join(", ") || "ADMIN",
  }

  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs overflow-hidden">
                <BrandLogo
                  logoUrl={logoUrl}
                  alt={appName}
                  customClassName="size-5 object-contain"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold tracking-wide font-heading">{appName}</span>
                <span className="truncate text-xs text-muted-foreground">Admin Console</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={defaultNavData.navMain} />
        <NavSecondary items={defaultNavData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={displayUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
