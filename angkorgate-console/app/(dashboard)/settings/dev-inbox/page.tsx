import { DevOutboxViewer, getDevOutboxAction } from "@/features/system"

export const dynamic = "force-dynamic"

export default async function DevInboxPage() {
  const res = await getDevOutboxAction()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Dev Outbox (Links &amp; OTP)
        </h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          Inspect Magic Links and 6-digit Email / SMS OTPs sent via the{" "}
          <code className="rounded bg-muted px-1 py-0.5">console</code>{" "}
          provider without checking server terminal logs.
        </p>
      </div>

      {!res.success || !res.messages ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 font-mono text-xs text-destructive">
          {res.message || "Unable to load dev outbox messages."}
        </div>
      ) : (
        <DevOutboxViewer initialMessages={res.messages} />
      )}
    </div>
  )
}
