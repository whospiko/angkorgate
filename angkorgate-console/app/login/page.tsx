import { Suspense } from "react"
import { redirect } from "next/navigation"
import { LoginForm } from "@/features/auth"
import { getPublicOAuthConfig } from "@/features/oauth-providers"
import { getSetupStatus, getBranding } from "@/features/system"

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const status = await getSetupStatus()

  if (!status.isInitialized) {
    redirect("/setup")
  }

  const [branding, oauthConfig] = await Promise.all([
    getBranding(),
    getPublicOAuthConfig(),
  ])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense
          fallback={
            <div className="text-center font-mono text-xs text-muted-foreground">
              Loading authentication...
            </div>
          }
        >
          <LoginForm
            branding={branding}
            oauthProviders={oauthConfig.providers}
            oauthBaseUrl={oauthConfig.callbackBaseUrl}
            oauthWebUrl={oauthConfig.webUrl}
          />
        </Suspense>
      </div>
    </div>
  )
}
