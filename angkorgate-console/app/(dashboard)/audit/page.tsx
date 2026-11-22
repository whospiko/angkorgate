import { getAuditLogs, AuditLogsTable } from "@/features/audit"

export const metadata = {
  title: "Audit Logs | AngkorGate",
}

export default async function AuditPage() {
  const auditData = await getAuditLogs()

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Audit Trail & Event Logs
          </h1>
          <p className="text-xs text-muted-foreground">
            Immutable security audit logs of authentication, authorization, and administrative events.
          </p>
        </div>
      </div>

      <AuditLogsTable logs={auditData.items} />
    </div>
  )
}
