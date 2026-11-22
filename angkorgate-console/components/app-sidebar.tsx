"use client"

import * as React from "react"
import Link from "next/link"
import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
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
  RiCommandLine,
  RiDashboardLine,
  RiShieldKeyholeLine,
  RiFileList3Line,
  RiBookOpenLine,
  RiServerLine,
  RiShieldCheckLine,
  RiRadarLine,
} from "@remixicon/react"

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
      title: "Operations & Audit",
      url: "/audit",
      icon: <RiFileList3Line className="size-4" />,
      isActive: true,
      items: [
        {
          title: "Audit Logs",
          url: "/audit",
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
      url: "http://localhost:8080/api#",
      icon: <RiBookOpenLine className="size-4" />,
      items: [
        {
          title: "Swagger API Explorer",
          url: "http://localhost:8080/api#",
        },
        {
          title: "OpenID Discovery JSON",
          url: "http://localhost:8080/oidc/.well-known/openid-configuration",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Core API Health",
      url: "http://localhost:8080/",
      icon: <RiServerLine className="size-4" />,
    },
    {
      title: "Cache Metrics",
      url: "http://localhost:8080/cache/status",
      icon: <RiRadarLine className="size-4" />,
    },
  ],
  projects: [
    {
      name: "AngkorGate Core",
      url: "http://localhost:8080",
      icon: <RiServerLine className="size-4" />,
    },
    {
      name: "OIDC Provider",
      url: "http://localhost:8080/oidc",
      icon: <RiShieldCheckLine className="size-4" />,
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
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                <RiCommandLine className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold tracking-wide font-heading">AngkorGate</span>
                <span className="truncate text-xs text-muted-foreground">Admin Console</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={defaultNavData.navMain} />
        <NavProjects projects={defaultNavData.projects} />
        <NavSecondary items={defaultNavData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={displayUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
