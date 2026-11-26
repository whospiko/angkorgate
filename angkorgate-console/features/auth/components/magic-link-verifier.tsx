"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  RiAlertLine,
  RiCheckDoubleLine,
  RiLoader4Line,
  RiMagicLine,
} from "@remixicon/react"
import { verifyMagicLinkAction } from "../server/passwordless-actions"

export function MagicLinkVerifier() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const redirectParam = searchParams.get("redirect") || "/dashboard"

  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    token ? "verifying" : "error"
  )
  const [message, setMessage] = useState<string>(
    token
      ? "Verifying your signed magic link..."
      : "Missing magic link token. Please request a new sign-in link."
  )
  const startedRef = useRef(false)

  useEffect(() => {
    if (!token || startedRef.current) return
    startedRef.current = true

    verifyMagicLinkAction(token, redirectParam).then((res) => {
      if (res.success) {
        setStatus("success")
        setMessage("Signed in! Redirecting you now...")
        window.location.href = res.redirectUrl || redirectParam || "/dashboard"
      } else {
        setStatus("error")
        setMessage(
          res.message ||
            "This magic link is invalid, expired, or has already been used."
        )
      }
    })
  }, [token, redirectParam])

  return (
    <div className="w-full max-w-sm rounded-lg border border-border/60 bg-card p-6 text-center shadow-sm">
      <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {status === "verifying" ? (
          <RiLoader4Line className="size-5 animate-spin" />
        ) : status === "success" ? (
          <RiCheckDoubleLine className="size-5 text-emerald-500" />
        ) : (
          <RiAlertLine className="size-5 text-destructive" />
        )}
      </div>

      <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
        {status === "verifying"
          ? "Signing You In"
          : status === "success"
            ? "Authentication Complete"
            : "Magic Link Invalid"}
      </h1>

      <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
        {message}
      </p>

      {status === "error" && (
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/login" className="w-full">
            <Button type="button" className="w-full font-mono text-xs">
              <RiMagicLine className="mr-1.5 size-3.5" />
              Return to Sign In
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
