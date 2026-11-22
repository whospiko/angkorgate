import { getOidcDiscovery, getOidcJwks, OidcDiscoveryCard } from "@/features/oidc"

export const metadata = {
  title: "OIDC Server Discovery | AngkorGate",
}

export default async function OidcPage() {
  const [discovery, jwks] = await Promise.all([getOidcDiscovery(), getOidcJwks()])

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            OpenID Connect Provider
          </h1>
          <p className="text-xs text-muted-foreground">
            Discovery configuration metadata, token endpoints, and published cryptographic keys (JWKS).
          </p>
        </div>
      </div>

      <OidcDiscoveryCard discovery={discovery} jwks={jwks} />
    </div>
  )
}
