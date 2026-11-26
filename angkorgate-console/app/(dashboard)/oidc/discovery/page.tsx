import { Metadata } from "next"
import {
  getOidcDiscovery,
  getOidcJwks,
  OidcDiscoveryInspector,
} from "@/features/oidc"
import { getPublicCoreUrl } from "@/lib/env"

export const metadata: Metadata = {
  title: "OpenID Discovery - AngkorGate",
  description: "Inspect published OpenID Connect discovery metadata and JWKS signing keys.",
}

export const dynamic = "force-dynamic"

export default async function OidcDiscoveryPage() {
  const [discovery, jwks] = await Promise.all([
    getOidcDiscovery(),
    getOidcJwks(),
  ])

  return (
    <OidcDiscoveryInspector
      discovery={discovery}
      jwks={jwks}
      coreApiUrl={getPublicCoreUrl()}
    />
  )
}
