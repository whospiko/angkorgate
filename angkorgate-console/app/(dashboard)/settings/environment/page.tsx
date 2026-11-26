import {
  getRuntimeConfigAction,
  RuntimeConfigForm,
} from "@/features/system"

export const dynamic = "force-dynamic"

export default async function EnvironmentSettingsPage() {
  const res = await getRuntimeConfigAction()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Environment &amp; Providers
        </h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          Manage SMTP, SMS gateway, Passwordless (Magic Link &amp; OTP),
          WebAuthn, and JWT session settings live without editing{" "}
          <code className="rounded bg-muted px-1 py-0.5">.env</code> or
          restarting the server.
        </p>
      </div>

      {!res.success || !res.settings ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 font-mono text-xs text-destructive">
          {res.message || "Unable to load runtime environment settings."}
        </div>
      ) : (
        <RuntimeConfigForm initialSettings={res.settings} />
      )}
    </div>
  )
}
