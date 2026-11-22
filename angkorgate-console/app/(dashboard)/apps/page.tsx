import { getApps, AppsTable, CreateAppDialog } from "@/features/apps"

export const metadata = {
  title: "Client Applications | AngkorGate",
}

export default async function AppsPage() {
  const apps = await getApps()

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Client Applications
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            Manage registered OpenID Connect and OAuth 2.0 client apps.
          </p>
        </div>
        <CreateAppDialog />
      </div>

      <AppsTable apps={apps} />
    </div>
  )
}
