import { Suspense } from "react"
import { MagicLinkVerifier } from "@/features/auth"

export const dynamic = "force-dynamic"

export default function MagicLinkPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6 md:p-10">
      <Suspense
        fallback={
          <div className="text-center font-mono text-xs text-muted-foreground">
            Verifying magic link...
          </div>
        }
      >
        <MagicLinkVerifier />
      </Suspense>
    </div>
  )
}
