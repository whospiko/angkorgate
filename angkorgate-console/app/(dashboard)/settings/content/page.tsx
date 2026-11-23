import { getBranding, ContentManagementForm } from "@/features/system"
import { getRoles } from "@/features/rbac"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Content Management & Branding | AngkorGate",
  description: "Configure application logo, name, organization, appearance, and dashboard access roles",
}

export default async function ContentManagementPage() {
  const [branding, roles] = await Promise.all([
    getBranding(),
    getRoles(),
  ])

  return <ContentManagementForm initialBranding={branding} allRoles={roles} />
}
