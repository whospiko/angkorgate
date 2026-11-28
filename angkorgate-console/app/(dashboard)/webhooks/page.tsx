import { getWebhookEndpoints, WebhooksManager } from "@/features/webhooks"

export const metadata = {
  title: "Webhooks & Events | AngkorGate",
}

export default async function WebhooksPage() {
  const endpoints = await getWebhookEndpoints()

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          HR & ERP Webhooks
        </h1>
        <p className="text-xs text-muted-foreground">
          Stream signed real-time events (`customer.created`, `employee.onboarded`, `leave.approved`) to external HIS/EMR, Hotel PMS, or POS systems.
        </p>
      </div>

      <WebhooksManager initialEndpoints={endpoints} />
    </div>
  )
}
