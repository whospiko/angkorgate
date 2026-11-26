import { Metadata } from "next"
import { ApiExplorerView, getOpenApiSpec } from "@/features/system"
import { getPublicCoreUrl } from "@/lib/env"

export const metadata: Metadata = {
  title: "Swagger API Explorer - AngkorGate",
  description: "Interactive OpenAPI specification and endpoint catalog for AngkorGate Core.",
}

export const dynamic = "force-dynamic"

export default async function ApiExplorerPage() {
  const spec = await getOpenApiSpec()

  return <ApiExplorerView spec={spec} coreApiUrl={getPublicCoreUrl()} />
}
