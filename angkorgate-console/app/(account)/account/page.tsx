import { redirect } from "next/navigation"
import { getMyProfile } from "@/features/account"
import { getBranding } from "@/features/system"
import { AccountPortalShell } from "@/features/account/components/account-portal-shell"

export const dynamic = "force-dynamic"

export default async function AccountPage() {
  const profile = await getMyProfile()

  if (!profile) {
    redirect("/login?unauthorized=1&redirect=/account")
  }

  const branding = await getBranding()
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
      appName={branding?.appName || "AngkorGate Identity"}
      logoUrl={branding?.logoUrl ?? undefined}
      canAccessDashboard={canAccessDashboard}
    />
  )
}
