import { redirect } from "next/navigation"
import { getMyProfile, getMyWorkspaceAction } from "@/features/account"
import { getBranding } from "@/features/system"
import { AccountPortalShell } from "@/features/account/components/account-portal-shell"

export const dynamic = "force-dynamic"

export default async function AccountPage() {
  const [profile, workspace, branding] = await Promise.all([
    getMyProfile(),
    getMyWorkspaceAction(),
    getBranding(),
  ])

  if (!profile) {
    redirect("/auth/sso?redirect=/account")
  }
  const allowedRoles =
    branding?.allowedDashboardRoles && branding.allowedDashboardRoles.length > 0
      ? branding.allowedDashboardRoles
      : ["ADMIN"]

  const userRoles = profile.roles || []
  const canAccessDashboard = userRoles.some((r) =>
    allowedRoles.some((allowed) => allowed.toUpperCase() === r.toUpperCase())
  )

  return (
    <AccountPortalShell
      initialProfile={profile}
      initialWorkspace={workspace}
      appName={branding?.appName || "AngkorGate Identity"}
      logoUrl={branding?.logoUrl ?? undefined}
      canAccessDashboard={canAccessDashboard}
    />
  )
}
