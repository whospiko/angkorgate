import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getCurrentUser } from "@/features/auth"
import { getSetupStatus, getBranding, BrandingProvider } from "@/features/system"

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

  const branding = await getBranding()

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
              {children}
            </SidebarInset>
          </div>
        </SidebarProvider>
      </div>
    </BrandingProvider>
  )
}
