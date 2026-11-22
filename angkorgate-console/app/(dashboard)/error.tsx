"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RiAlertLine, RiRefreshLine, RiArrowRightLine } from "@remixicon/react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard caught error:", error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 min-h-[60vh]">
      <div className="w-full max-w-md rounded-lg border border-border/60 bg-card p-6 shadow-sm text-center space-y-4">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive border border-destructive/20">
          <RiAlertLine className="size-6" />
        </div>

        <Badge variant="outline" className="font-mono text-xs text-destructive border-destructive/30">
          Operation Interrupted
        </Badge>

        <div className="space-y-1">
          <h2 className="font-heading text-lg font-bold">Failed to load content</h2>
          <p className="font-mono text-xs text-muted-foreground leading-relaxed">
            {error.message || "An unexpected error occurred while communicating with AngkorGate Core."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button onClick={() => reset()} className="flex-1 font-mono text-xs">
            <RiRefreshLine className="mr-1.5 size-4" />
            Try Again
          </Button>
          <Button variant="outline" render={<Link href="/dashboard" />} className="flex-1 font-mono text-xs">
            Overview <RiArrowRightLine className="ml-1.5 size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
