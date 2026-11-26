import { Metadata } from "next"
import { DocsShell } from "@/features/docs"
import { getBranding } from "@/features/system"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Documentation | AngkorGate IAM",
  description: "Complete architectural guide, OIDC testing instructions, and developer reference for AngkorGate.",
}

export default async function DocsPage() {
  const branding = await getBranding()
  return (
    <DocsShell
      appName={branding.appName || "AngkorGate"}
      logoUrl={branding.logoUrl}
    />
  )
}
