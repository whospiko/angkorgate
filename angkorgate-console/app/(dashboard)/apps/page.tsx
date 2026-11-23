import { getApps, AppsTable, CreateClientWizard } from "@/features/apps"
import { getScopes } from "@/features/scopes"

export const metadata = {
  title: "Client Applications | AngkorGate",
}

export default async function AppsPage() {
  const [apps, scopes] = await Promise.all([getApps(), getScopes()])

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Client Applications
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            Manage OpenID Connect & OAuth 2.0 clients, authentication credentials, and granted scopes.
          </p>
        </div>
        <CreateClientWizard availableScopes={scopes} />
      </div>

      <AppsTable apps={apps} availableScopes={scopes} />
    </div>
  )
}
