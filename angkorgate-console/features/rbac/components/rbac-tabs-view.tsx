"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { RiShieldUserLine, RiKey2Line } from "@remixicon/react"
import type { Role, Permission } from "../types/rbac.types"
import { RolesTable } from "./roles-table"
import { PermissionsTable } from "./permissions-table"
import { CreateRoleDialog } from "./create-role-dialog"
import { CreatePermissionDialog } from "./create-permission-dialog"
import { UserOverridesDialog } from "./user-overrides-dialog"

interface RbacTabsViewProps {
  roles: Role[]
  permissions: Permission[]
  defaultTab?: "roles" | "permissions"
}

export function RbacTabsView({
  roles,
  permissions,
  defaultTab = "roles",
}: RbacTabsViewProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab)

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Roles & Permissions (RBAC)
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
            Configure access control policies, permissions catalog, and security role hierarchies.
          </p>
        </div>

        {/* Dynamic Action Buttons based on Active Tab */}
        <div className="flex items-center gap-2">
          {activeTab === "roles" ? (
            <CreateRoleDialog permissions={permissions} />
          ) : (
            <>
              <UserOverridesDialog allPermissions={permissions} />
              <CreatePermissionDialog />
            </>
          )}
        </div>
      </div>

      {/* Main Tabs Container */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full space-y-4"
      >
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <TabsList className="bg-muted/40 p-1 font-mono text-xs">
            <TabsTrigger
              value="roles"
              className="gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs px-4"
            >
              <RiShieldUserLine className="size-4" />
              <span>Roles</span>
              <Badge
                variant="secondary"
                className="font-mono text-[10px] px-1.5 py-0 h-4 bg-muted"
              >
                {roles.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="permissions"
              className="gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs px-4"
            >
              <RiKey2Line className="size-4" />
              <span>Permissions</span>
              <Badge
                variant="secondary"
                className="font-mono text-[10px] px-1.5 py-0 h-4 bg-muted"
              >
                {permissions.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <span className="hidden md:inline-block font-mono text-[11px] text-muted-foreground">
            {activeTab === "roles"
              ? "Select checkboxes on each role to manage granted permissions"
              : "Granular resource:action security catalog"}
          </span>
        </div>

        {/* Roles Tab Content */}
        <TabsContent value="roles" className="mt-0 space-y-4 focus-visible:outline-none">
          <RolesTable roles={roles} permissions={permissions} />
        </TabsContent>

        {/* Permissions Tab Content */}
        <TabsContent value="permissions" className="mt-0 space-y-4 focus-visible:outline-none">
          <PermissionsTable permissions={permissions} roles={roles} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
