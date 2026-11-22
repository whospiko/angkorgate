import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RiShieldKeyholeLine, RiCodeSSlashLine } from "@remixicon/react"
import type { OidcDiscoveryDoc, JwksResponse } from "../types/oidc.types"

interface OidcDiscoveryCardProps {
  discovery: OidcDiscoveryDoc | null
  jwks: JwksResponse | null
}

export function OidcDiscoveryCard({ discovery, jwks }: OidcDiscoveryCardProps) {
  if (!discovery) {
    return (
      <Card className="border border-border/50">
        <CardHeader>
          <CardTitle className="font-heading text-lg">OIDC Authorization Server</CardTitle>
          <CardDescription className="font-mono text-xs">
            OpenID Connect Provider Discovery metadata unavailable.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="border border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RiShieldKeyholeLine className="size-5 text-primary" />
              <CardTitle className="font-heading text-lg">OIDC Discovery</CardTitle>
            </div>
            <Badge variant="outline" className="font-mono text-xs text-emerald-600 border-emerald-600/40">
              Active Provider
            </Badge>
          </div>
          <CardDescription className="font-mono text-xs truncate">
            Issuer: {discovery.issuer}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 font-mono text-xs">
            <div className="p-2.5 rounded-md bg-muted/40 border border-border/40">
              <div className="text-muted-foreground text-[10px] uppercase">Token Endpoint</div>
              <div className="font-semibold text-foreground truncate">{discovery.token_endpoint}</div>
            </div>
            <div className="p-2.5 rounded-md bg-muted/40 border border-border/40">
              <div className="text-muted-foreground text-[10px] uppercase">Authorization Endpoint</div>
              <div className="font-semibold text-foreground truncate">{discovery.authorization_endpoint}</div>
            </div>
            <div className="p-2.5 rounded-md bg-muted/40 border border-border/40">
              <div className="text-muted-foreground text-[10px] uppercase">UserInfo Endpoint</div>
              <div className="font-semibold text-foreground truncate">{discovery.userinfo_endpoint}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-[11px] mb-1.5">Supported Scopes</div>
              <div className="flex gap-1.5 flex-wrap">
                {discovery.scopes_supported?.map((s) => (
                  <Badge key={s} variant="secondary" className="font-mono text-[10px]">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <RiCodeSSlashLine className="size-5 text-primary" />
            <CardTitle className="font-heading text-lg">JWKS Public Keys</CardTitle>
          </div>
          <CardDescription className="font-mono text-xs">
            Signing keys published at {discovery.jwks_uri}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jwks && jwks.keys && jwks.keys.length > 0 ? (
            <div className="space-y-3 font-mono text-xs">
              {jwks.keys.map((k, i) => (
                <div key={k.kid || i} className="p-3 rounded-md bg-muted/30 border border-border/40">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold">Key ID: {k.kid || "default"}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {k.kty} / {k.alg || "RS256"}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground text-[10px]">
                    Usage: {k.use || "sig"} · Algorithm: {k.alg || "RS256"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground font-mono text-xs py-4 text-center">
              No keys available in current JWKS.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
