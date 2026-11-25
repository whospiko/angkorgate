import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getSetupStatus, getBranding, BrandingProvider } from "@/features/system"

export const dynamic = "force-dynamic"

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const status = await getSetupStatus()
  if (!status.isInitialized) {
    redirect("/setup")
  }

  const cookieStore = await cookies()
  const token = cookieStore.get("angkorgate_token")?.value

  if (!token) {
    redirect("/login?unauthorized=1&redirect=/account")
  }

  const branding = await getBranding()

  return (
    <BrandingProvider initialBranding={branding}>
      {children}
    </BrandingProvider>
  )
}
