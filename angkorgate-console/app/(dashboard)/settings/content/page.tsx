import { getBranding, ContentManagementForm } from "@/features/system"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Content Management & Branding | AngkorGate",
  description: "Configure application logo, name, organization, and appearance",
}

export default async function ContentManagementPage() {
  const branding = await getBranding()

  return <ContentManagementForm initialBranding={branding} />
}
