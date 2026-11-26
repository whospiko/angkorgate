import { Metadata } from "next"
import {
  getApiKeys,
  getSchemaResources,
  ApiKeysStats,
  ApiKeysTable,
  CreateApiKeyDialog,
} from "@/features/api-keys"
import { RiKey2Line } from "@remixicon/react"

export const metadata: Metadata = {
  title: "API Keys & Developer Integrations - AngkorGate",
  description: "Manage developer API keys, granular HTTP method policies, and field-level response filtering.",
}

export const dynamic = "force-dynamic"

export default async function ApiKeysPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>
}) {
  const [{ create }, apiKeys, schemaResources] = await Promise.all([
    searchParams,
    getApiKeys(),
    getSchemaResources(),
  ])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              API Keys & Integrations
            </h1>
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            Developer portal and machine-to-machine handshake gateway for Customers and Employees APIs.
          </p>
        </div>

        <CreateApiKeyDialog
          schemaResources={schemaResources}
          defaultOpen={create === "1"}
        />
      </div>

      {/* Stats Cards */}
      <ApiKeysStats apiKeys={apiKeys} />

      {/* Main Table */}
      <div className="space-y-3">
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground">
            Active Integration Keys
          </h2>
          <p className="text-xs text-muted-foreground font-mono">
            Keys authenticated via <code className="text-foreground">x-api-key</code> or <code className="text-foreground">Authorization: Bearer</code> headers.
          </p>
        </div>

        <ApiKeysTable apiKeys={apiKeys} schemaResources={schemaResources} />
      </div>
    </div>
  )
}
