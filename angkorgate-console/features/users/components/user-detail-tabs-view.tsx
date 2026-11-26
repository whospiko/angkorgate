"use client"

import { useState } from "react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  RiInformationLine,
  RiShieldUserLine,
  RiLockPasswordLine,
  RiArrowLeftLine,
  RiUserLine,
  RiBuildingLine,
  RiCheckLine,
  RiCloseLine,
  RiErrorWarningLine,
} from "@remixicon/react"
import type { User, LinkedAccount, LinkedSocialAccount } from "../types/users.types"
import type { Role, Permission } from "@/features/rbac/types/rbac.types"
import { OAuthProviderIcon } from "@/components/oauth-provider-icon"
import { UserInfoTab } from "./user-info-tab"
import { UserAssignTab } from "./user-assign-tab"
import { UserSecurityTab } from "./user-security-tab"

interface UserDetailTabsViewProps {
  user: User
  allRoles: Role[]
  allPermissions: Permission[]
  linkedAccount: LinkedAccount
  oauthAccounts?: LinkedSocialAccount[]
  defaultTab?: "information" | "assign" | "security"
}

export function UserDetailTabsView({
  user,
  allRoles,
  allPermissions,
  linkedAccount,
  oauthAccounts = [],
  defaultTab = "information",
}: UserDetailTabsViewProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab)

  const isLocked = Boolean(user.lockedUntil && new Date(user.lockedUntil) > new Date())
  const failedAttempts = user.failedAttempts ?? user.failedLoginAttempts ?? 0

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Navigation Breadcrumb / Back Link */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground -ml-2"
          render={<Link href="/users" />}
        >
          <RiArrowLeftLine className="size-4" />
          <span>Back to Users</span>
        </Button>
      </div>

      {/* User Header Identity Banner */}
      <div className="rounded-xl border border-border/60 bg-card p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex aspect-square size-14 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <RiUserLine className="size-7" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
                  {user.email ||
                    user.phone ||
                    (linkedAccount.type !== "none" ? linkedAccount.data.fullName : undefined) ||
                    user.fullName ||
                    "User Account"}
                </h1>

                {/* Status Badge */}
                <Badge
                  variant={user.isActive ? "outline" : "secondary"}
                  className="font-mono text-xs gap-1"
                >
                  <span
                    className={`size-1.5 rounded-full inline-block ${
                      user.isActive ? "bg-emerald-500" : "bg-muted-foreground"
                    }`}
                  />
                  {user.isActive ? "Active" : "Deactivated"}
                </Badge>

                {/* Verification Badge */}
                {user.isEmailVerified ? (
                  <Badge variant="outline" className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 gap-1 border-emerald-500/30">
                    <RiCheckLine className="size-3" /> Email Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="font-mono text-[10px] text-muted-foreground gap-1">
                    <RiCloseLine className="size-3" /> Email Unverified
                  </Badge>
                )}

                {/* Lock Warning Badge if active */}
                {isLocked && (
                  <Badge variant="destructive" className="font-mono text-[10px] gap-1">
                    <RiErrorWarningLine className="size-3" /> Locked ({failedAttempts} failed)
                  </Badge>
                )}

                {/* Linked Association Badge */}
                {linkedAccount.type === "employee" && (
                  <Badge variant="outline" className="font-mono text-[10px] gap-1 text-primary border-primary/30 bg-primary/5">
                    <RiBuildingLine className="size-3" />
                    Employee ({linkedAccount.data.employeeCode})
                  </Badge>
                )}
                {linkedAccount.type === "customer" && (
                  <Badge variant="outline" className="font-mono text-[10px] gap-1 text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/5">
                    <RiUserLine className="size-3" />
                    Customer ({linkedAccount.data.customerCode || linkedAccount.data.type})
                  </Badge>
                )}

                {oauthAccounts.map((acc) => (
                  <Badge
                    key={acc.id}
                    variant="outline"
                    className="font-mono text-[10px] gap-1 capitalize border-primary/30 bg-primary/5 text-primary"
                  >
                    <OAuthProviderIcon code={acc.provider} className="size-3" />
                    {acc.provider}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground flex-wrap">
                <span>UUID:</span>
                <code className="text-foreground select-all bg-muted/50 px-1.5 py-0.5 rounded text-[11px]">
                  {user.id}
                </code>
                {user.phone && (
                  <>
                    <span className="text-border">•</span>
                    <span>Phone: <span className="text-foreground">{user.phone}</span></span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Header Summary Pills */}
          <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
            <div className="px-3 py-2 rounded-lg bg-muted/30 border border-border/40 text-center">
              <span className="text-[10px] text-muted-foreground block uppercase">Assigned Roles</span>
              <span className="font-bold text-foreground text-sm">{(user.roles || []).length}</span>
            </div>
            <div className="px-3 py-2 rounded-lg bg-muted/30 border border-border/40 text-center">
              <span className="text-[10px] text-muted-foreground block uppercase">Failed Logins</span>
              <span className={`text-sm font-bold ${failedAttempts > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                {failedAttempts}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Container styled identically to RBAC tab view */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full space-y-4"
      >
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <TabsList className="bg-muted/40 p-1 font-mono text-xs">
            {/* Information Tab */}
            <TabsTrigger
              value="information"
              className="gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs px-4"
            >
              <RiInformationLine className="size-4" />
              <span>Information</span>
            </TabsTrigger>

            {/* Assign Tab */}
            <TabsTrigger
              value="assign"
              className="gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs px-4"
            >
              <RiShieldUserLine className="size-4" />
              <span>Assign</span>
              <Badge
                variant="secondary"
                className="font-mono text-[10px] px-1.5 py-0 h-4 bg-muted"
              >
                {(user.roles || []).length}
              </Badge>
            </TabsTrigger>

            {/* Security Tab */}
            <TabsTrigger
              value="security"
              className="gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs px-4"
            >
              <RiLockPasswordLine className="size-4" />
              <span>Security</span>
            </TabsTrigger>
          </TabsList>

          <span className="hidden md:inline-block font-mono text-[11px] text-muted-foreground">
            {activeTab === "information"
              ? "Account details and linked customer / employee profile association"
              : activeTab === "assign"
              ? "Assign security roles and audit granted capabilities"
              : "Password management, brute-force reset, and credential security"}
          </span>
        </div>

        {/* Information Tab Content */}
        <TabsContent value="information" className="mt-0 space-y-4 focus-visible:outline-none">
          <UserInfoTab
            user={user}
            linkedAccount={linkedAccount}
            oauthAccounts={oauthAccounts}
          />
        </TabsContent>

        {/* Assign Tab Content */}
        <TabsContent value="assign" className="mt-0 space-y-4 focus-visible:outline-none">
          <UserAssignTab user={user} allRoles={allRoles} allPermissions={allPermissions} />
        </TabsContent>

        {/* Security Tab Content */}
        <TabsContent value="security" className="mt-0 space-y-4 focus-visible:outline-none">
          <UserSecurityTab user={user} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
