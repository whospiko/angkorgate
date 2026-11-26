import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getCurrentUser } from "@/features/auth"
import {
  getSetupStatus,
  getBranding,
  getMaintenanceModeAction,
  BrandingProvider,
} from "@/features/system"
import { CommandPalette } from "@/features/command-palette"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const status = await getSetupStatus()
  if (!status.isInitialized) {
    redirect("/setup")
  }

  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect("/login?unauthorized=1")
  }

  const [branding, maintenanceStatus] = await Promise.all([
    getBranding(),
    getMaintenanceModeAction(),
  ])

  // Enforce configurable dashboard access by role (default: ADMIN, supports multi-role)
  const allowedRoles =
    branding.allowedDashboardRoles && branding.allowedDashboardRoles.length > 0
      ? branding.allowedDashboardRoles
      : ["ADMIN"]

  const userRoles = currentUser.roles || []
  const hasAccess = userRoles.some((r) =>
    allowedRoles.some((allowed) => allowed.toUpperCase() === r.toUpperCase())
  )

  if (!hasAccess) {
    redirect("/account")
  }

  return (
    <BrandingProvider initialBranding={branding}>
      <div className="[--header-height:calc(--spacing(14))] min-h-svh flex flex-col">
        <SidebarProvider className="flex flex-col flex-1">
          <SiteHeader />
          <div className="flex flex-1">
            <AppSidebar currentUser={currentUser} />
            <SidebarInset className="flex-1 p-6">
              {maintenanceStatus.maintenanceMode && (
                <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 font-mono text-xs text-amber-500">
                  <span>
                    Maintenance Mode is active — public registration and OAuth/OIDC flows are paused.
                  </span>
                  <span className="font-semibold">⌘K to toggle</span>
                </div>
              )}
              {children}
            </SidebarInset>
          </div>
          <CommandPalette initialMaintenanceMode={maintenanceStatus.maintenanceMode} />
        </SidebarProvider>
      </div>
    </BrandingProvider>
  )
}
