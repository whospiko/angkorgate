import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RiShieldCrossLine, RiArrowRightLine, RiLogoutBoxLine } from "@remixicon/react"

export const metadata = {
  title: "403 Forbidden | AngkorGate",
}

export default function Forbidden() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md rounded-lg border border-border/60 bg-card p-8 shadow-sm">
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
              Access Forbidden
            </h1>
            <p className="font-mono text-xs text-muted-foreground leading-relaxed">
              Your account is authenticated, but does not possess the required RBAC
              permissions to view or perform operations in this management zone.
            </p>
          </div>

          <div className="pt-2 w-full flex flex-col sm:flex-row gap-2.5">
            <Button
              render={<Link href="/dashboard" />}
              className="flex-1 font-mono text-xs"
            >
              Console Overview <RiArrowRightLine className="ml-1.5 size-4" />
            </Button>
            <Button
              variant="outline"
              render={<Link href="/login" />}
              className="flex-1 font-mono text-xs"
            >
              <RiLogoutBoxLine className="mr-1.5 size-4" />
              Switch Account
            </Button>
          </div>

          <div className="pt-4 border-t border-border/40 w-full text-center">
            <span className="font-mono text-[11px] text-muted-foreground">
              AngkorGate RBAC Engine &bull; Role Authorization Control
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
