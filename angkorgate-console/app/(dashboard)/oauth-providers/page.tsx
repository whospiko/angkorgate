import {
  getOAuthProviders,
  OAuthProvidersTable,
  CreateOAuthProviderDialog,
} from "@/features/oauth-providers"

export const metadata = {
  title: "OAuth Identity Providers | AngkorGate",
}

export default async function OAuthProvidersPage() {
  const providers = await getOAuthProviders()

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            OAuth Identity Providers
          </h1>
          <p className="text-xs text-muted-foreground">
            Configure federated social identity providers (Google, Apple, Microsoft, etc.).
          </p>
        </div>
        <CreateOAuthProviderDialog />
      </div>

      <OAuthProvidersTable providers={providers} />
    </div>
  )
}
