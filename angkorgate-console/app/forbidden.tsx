import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RiShieldCrossLine, RiLogoutBoxLine, RiShieldUserLine } from "@remixicon/react"
import { getCurrentUser } from "@/features/auth"
import { getBranding } from "@/features/system"

export const metadata = {
  title: "403 Forbidden | AngkorGate",
}

export default async function Forbidden() {
  const [currentUser, branding] = await Promise.all([
    getCurrentUser().catch(() => null),
    getBranding().catch(() => null),
  ])

  const userRoles = currentUser?.roles || []
  const allowedRoles = branding?.allowedDashboardRoles && branding.allowedDashboardRoles.length > 0
    ? branding.allowedDashboardRoles
    : ["ADMIN"]

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-lg rounded-xl border border-border/60 bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive border border-destructive/20 shadow-xs">
            <RiShieldCrossLine className="size-7" />
          </div>

          <Badge
            variant="outline"
            className="font-mono text-xs gap-1.5 border-destructive/30 text-destructive bg-destructive/5"
          >
            <span className="size-1.5 rounded-full bg-destructive inline-block" />
            HTTP 403 Forbidden
          </Badge>

          <div className="space-y-1.5">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Dashboard Access Restricted
            </h1>
            <p className="font-mono text-xs text-muted-foreground leading-relaxed max-w-md">
              This administrative dashboard is restricted to authorized roles. Your account is authenticated, but does not possess an authorized role to access the console.
            </p>
          </div>

          {/* Account & Role Context Card */}
          {currentUser && (
            <div className="w-full rounded-lg border border-border/50 bg-muted/20 p-4 font-mono text-xs text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">Signed in as:</span>
                <span className="font-medium text-foreground truncate max-w-[240px]">{currentUser.email || currentUser.id}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">Your Current Roles:</span>
                <div className="flex gap-1 flex-wrap justify-end">
                  {userRoles.length > 0 ? (
                    userRoles.map((r) => (
                      <Badge key={r} variant="secondary" className="text-[10px] bg-muted">
                        {r}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="text-[10px]">No roles assigned</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <span className="text-muted-foreground text-[11px]">Authorized Console Roles:</span>
                <div className="flex gap-1 flex-wrap justify-end">
                  {allowedRoles.map((r) => (
                    <Badge key={r} variant="outline" className="text-[10px] border-primary/30 text-primary">
                      {r}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 w-full flex flex-col sm:flex-row gap-2.5">
            <Button
              variant="default"
              render={<Link href="/login?unauthorized=1" />}
              className="flex-1 font-mono text-xs"
            >
              <RiLogoutBoxLine className="mr-1.5 size-4" />
              Sign Out & Switch Account
            </Button>
          </div>

          <div className="pt-4 border-t border-border/40 w-full text-center">
            <span className="font-mono text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
              <RiShieldUserLine className="size-3.5 text-primary" />
              AngkorGate Dynamic Role Access Controller
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
