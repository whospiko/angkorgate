"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useTheme } from "next-themes"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  RiUserLine,
  RiShieldKeyholeLine,
  RiMacbookLine,
  RiBriefcase4Line,
  RiArrowLeftLine,
  RiLogoutBoxLine,
  RiSunLine,
  RiMoonLine,
  RiDashboardLine,
  RiExternalLinkLine,
} from "@remixicon/react"
import { BrandLogo } from "@/features/system"
import type { MyWorkspaceData, UserProfile } from "../types/account.types"
import { AccountProfileTab } from "./account-profile-tab"
import { AccountSecurityTab } from "./account-security-tab"
import { AccountSessionsTab } from "./account-sessions-tab"
import { AccountWorkspaceTab } from "./account-workspace-tab"
import { logoutAction } from "@/features/auth"

interface AccountPortalShellProps {
  initialProfile: UserProfile
  initialWorkspace?: MyWorkspaceData
  appName?: string
  logoUrl?: string
  canAccessDashboard?: boolean
}

export function AccountPortalShell({
  initialProfile,
  initialWorkspace,
  appName = "AngkorGate Identity",
  logoUrl,
  canAccessDashboard = false,
}: AccountPortalShellProps) {
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get("return_url")
  const clientAppName = searchParams.get("app_name") || "Your Application"

  const [profile, setProfile] = useState<UserProfile>(initialProfile)
  const { resolvedTheme, setTheme } = useTheme()

  const handleLogout = async () => {
    await logoutAction()
  }

  const initials = (profile.fullName || profile.email || "AG")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md px-4 sm:px-8 h-16 flex items-center justify-between">
        {/* Brand & Return Link */}
        <div className="flex items-center gap-4">
          <Link href="/account" className="flex items-center gap-2.5 font-bold text-lg font-sans">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm overflow-hidden">
              <BrandLogo
                logoUrl={logoUrl}
                alt={appName}
                customClassName="size-5 object-contain"
              />
            </div>
            <span>{appName}</span>
          </Link>

          {/* Conditional Return to Client App Button */}
          {returnUrl && (
            <div className="hidden sm:flex items-center border-l border-border pl-4">
              <a
                href={returnUrl}
                className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-primary hover:text-primary/80 transition-colors bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-md border border-primary/30"
              >
                <RiArrowLeftLine className="h-3.5 w-3.5" />
                Return to {clientAppName}
              </a>
            </div>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Dashboard shortcut for Admins / Staff */}
          {canAccessDashboard && (
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <RiDashboardLine className="h-3.5 w-3.5 text-primary" />
              Admin Console
            </Link>
          )}

          {/* Theme Switcher */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            title="Toggle theme"
          >
            {resolvedTheme === "dark" ? (
              <RiSunLine className="h-4 w-4" />
            ) : (
              <RiMoonLine className="h-4 w-4" />
            )}
          </Button>

          {/* User Menu Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger render={<button />} className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50">
              <Avatar className="h-8 w-8 border border-border bg-muted">
                <AvatarFallback className="text-xs font-bold text-primary font-mono">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-border bg-card">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none truncate">
                    {profile.fullName || "User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground font-mono truncate">
                    {profile.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              {canAccessDashboard && (
                <DropdownMenuItem render={<Link href="/dashboard" />} className="cursor-pointer">
                  <RiDashboardLine className="mr-2 h-4 w-4 text-primary" />
                  <span>Admin Console</span>
                </DropdownMenuItem>
              )}
              {returnUrl && (
                <DropdownMenuItem render={<a href={returnUrl} />} className="cursor-pointer">
                  <RiExternalLinkLine className="mr-2 h-4 w-4 text-primary" />
                  <span>Back to {clientAppName}</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer"
              >
                <RiLogoutBoxLine className="mr-2 h-4 w-4" />
                <span>Log Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile Return Button Banner */}
      {returnUrl && (
        <div className="sm:hidden bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-mono text-muted-foreground">Linked from {clientAppName}</span>
          <a
            href={returnUrl}
            className="inline-flex items-center gap-1 text-xs font-mono font-medium text-primary underline"
          >
            Return <RiArrowLeftLine className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight">
            Account & Security Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your personal profile, zero-phishing biometric passkeys, active sessions, and staff workspace.
          </p>
        </div>

        {/* Tabbed Portal Navigation */}
        <Tabs
          defaultValue={
            searchParams.get("tab") === "workspace" && initialWorkspace?.employee
              ? "workspace"
              : searchParams.get("tab") === "security"
              ? "security"
              : searchParams.get("tab") === "sessions"
              ? "sessions"
              : "profile"
          }
          className="w-full space-y-6"
        >
          <TabsList
            className={`grid w-full h-auto bg-muted/60 p-1 border border-border rounded-lg ${
              initialWorkspace?.employee
                ? "grid-cols-2 sm:grid-cols-4 max-w-2xl"
                : "grid-cols-3 max-w-md"
            }`}
          >
            <TabsTrigger
              value="profile"
              className="gap-2 text-xs sm:text-sm font-medium data-[state=active]:bg-card data-[state=active]:text-foreground"
            >
              <RiUserLine className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="gap-2 text-xs sm:text-sm font-medium data-[state=active]:bg-card data-[state=active]:text-foreground"
            >
              <RiShieldKeyholeLine className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="gap-2 text-xs sm:text-sm font-medium data-[state=active]:bg-card data-[state=active]:text-foreground"
            >
              <RiMacbookLine className="h-4 w-4" />
              Sessions
            </TabsTrigger>
            {initialWorkspace?.employee && (
              <TabsTrigger
                value="workspace"
                className="gap-2 text-xs sm:text-sm font-medium data-[state=active]:bg-card data-[state=active]:text-foreground"
              >
                <RiBriefcase4Line className="h-4 w-4" />
                My Workspace
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="outline-none focus:outline-none">
            <AccountProfileTab
              profile={profile}
              onProfileUpdated={(updated) => setProfile(updated)}
            />
          </TabsContent>

          {/* Security & Passkeys Tab */}
          <TabsContent value="security" className="outline-none focus:outline-none">
            <AccountSecurityTab profile={profile} />
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="outline-none focus:outline-none">
            <AccountSessionsTab />
          </TabsContent>

          {/* Employee Self-Service Workspace Tab */}
          {initialWorkspace?.employee && (
            <TabsContent value="workspace" className="outline-none focus:outline-none">
              <AccountWorkspaceTab initialData={initialWorkspace} />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  )
}
