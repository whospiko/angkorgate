import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RiShieldKeyholeLine, RiArrowRightLine, RiLoginBoxLine } from "@remixicon/react"

export const metadata = {
  title: "401 Unauthorized | AngkorGate",
}

export default function Unauthorized() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md rounded-lg border border-border/60 bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs">
            <RiShieldKeyholeLine className="size-7" />
          </div>

          <Badge
            variant="outline"
            className="font-mono text-xs gap-1.5 border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/5"
          >
            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
            HTTP 401 Unauthorized
          </Badge>

          <div className="space-y-1.5">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Authentication Required
            </h1>
            <p className="font-mono text-xs text-muted-foreground leading-relaxed">
              You do not have active credentials to access this AngkorGate Console area.
              Please sign in with an authorized administrator account to continue.
            </p>
          </div>

          <div className="pt-2 w-full flex flex-col sm:flex-row gap-2.5">
            <Button
              render={<Link href="/login" />}
              className="flex-1 font-mono text-xs"
            >
              <RiLoginBoxLine className="mr-1.5 size-4" />
              Sign In to Console
            </Button>
            <Button
              variant="outline"
              render={<Link href="/dashboard" />}
              className="flex-1 font-mono text-xs"
            >
              Try Dashboard <RiArrowRightLine className="ml-1.5 size-4" />
            </Button>
          </div>

          <div className="pt-4 border-t border-border/40 w-full text-center">
            <span className="font-mono text-[11px] text-muted-foreground">
              AngkorGate Gateway Security Policy &bull; RFC 6749 / RFC 7662
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
