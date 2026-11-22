"use client"

import { useActionState, useState } from "react"
import { useSearchParams } from "next/navigation"
import { cn } from "cn"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  RiCommandLine,
  RiLoader4Line,
  RiEyeLine,
  RiEyeOffLine,
  RiAlertLine,
  RiShieldKeyholeLine,
  RiTimerLine,
} from "@remixicon/react"
import { loginAction } from "../server/auth-actions"
import { OAuthProviders } from "./oauth-providers"

export interface LoginFormProps extends React.ComponentProps<"div"> {
  branding?: {
    appName: string
    appDescription?: string | null
    logoUrl?: string | null
    faviconUrl?: string | null
    organizationName?: string | null
    supportEmail?: string | null
    footerText?: string | null
  }
}

export function LoginForm({
  className,
  branding,
  ...props
}: LoginFormProps) {
  const appName = branding?.appName || "AngkorGate"
  const logoUrl = branding?.logoUrl
  const appDescription =
    branding?.appDescription ||
    "Sign in to manage API routes, gateway policies, and OIDC identity."
  const [state, formAction, isPending] = useActionState(loginAction, null)
  const [showPassword, setShowPassword] = useState(false)
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get("redirect") || "/dashboard"
  const isUnauthorized =
    searchParams.get("unauthorized") === "1" ||
    (Boolean(searchParams.get("redirect")) &&
      searchParams.get("redirect") !== "/" &&
      searchParams.get("redirect") !== "/dashboard")
  const isExpired = searchParams.get("expired") === "1"

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form action={formAction}>
        <input type="hidden" name="redirect" value={redirectParam} />
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <Link
              href="/"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm overflow-hidden">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={appName} className="size-6 object-contain" />
                ) : (
                  <RiCommandLine className="size-6" />
                )}
              </div>
              <span className="sr-only">{appName}</span>
            </Link>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Welcome to {appName}
            </h1>
            <FieldDescription className="font-mono text-xs">
              {appDescription}
            </FieldDescription>
          </div>

          {/* 401 Unauthorized Notice Banner */}
          {isUnauthorized && !state?.message && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs font-mono text-amber-900 dark:text-amber-300 shadow-xs">
              <RiShieldKeyholeLine className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="flex-1 space-y-1">
                <div className="font-semibold uppercase tracking-wider text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <span className="inline-block size-1.5 rounded-full bg-amber-500 animate-pulse" />
                  401 Unauthorized
                </div>
                <div className="text-xs text-foreground/90 leading-relaxed">
                  You are unauthorized to access{" "}
                  <span className="font-semibold underline decoration-amber-500/50">
                    {redirectParam}
                  </span>
                  . Please sign in with an authorized account to continue.
                </div>
              </div>
            </div>
          )}

          {/* Session Expired Notice Banner */}
          {isExpired && !state?.message && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs font-mono text-amber-900 dark:text-amber-300 shadow-xs">
              <RiTimerLine className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="flex-1 space-y-1">
                <div className="font-semibold uppercase tracking-wider text-[11px] text-amber-700 dark:text-amber-400">
                  Session Expired
                </div>
                <div className="text-xs text-foreground/90 leading-relaxed">
                  Your session has expired. Please sign in again to restore access.
                </div>
              </div>
            </div>
          )}

          {/* Authentication Failed / Invalid Credentials Error Banner */}
          {state?.message && !state?.success && (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs font-mono text-destructive shadow-xs">
              <RiAlertLine className="mt-0.5 size-4 shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span className="inline-block size-1.5 rounded-full bg-destructive" />
                  Authentication Failed
                </div>
                <div className="text-xs leading-relaxed">{state.message}</div>
              </div>
            </div>
          )}

          <Field>
            <FieldLabel htmlFor="email" className="font-mono text-xs">
              Email address
            </FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="admin@angkorgate.local"
              autoComplete="email"
              required
              disabled={isPending}
              className={cn(
                "font-mono text-sm",
                state?.errors?.email &&
                  "border-destructive focus-visible:ring-destructive"
              )}
            />
            {state?.errors?.email && (
              <p className="text-xs text-destructive font-mono mt-1">
                {state.errors.email[0]}
              </p>
            )}
          </Field>

          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="password" className="font-mono text-xs">
                Password
              </FieldLabel>
              <a
                href="#"
                className="text-xs font-mono text-muted-foreground hover:text-primary underline underline-offset-4"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                autoComplete="current-password"
                required
                disabled={isPending}
                className={cn(
                  "font-mono text-sm pr-9",
                  state?.errors?.password &&
                    "border-destructive focus-visible:ring-destructive"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-hidden"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <RiEyeOffLine className="size-4" />
                ) : (
                  <RiEyeLine className="size-4" />
                )}
              </button>
            </div>
            {state?.errors?.password && (
              <p className="text-xs text-destructive font-mono mt-1">
                {state.errors.password[0]}
              </p>
            )}
          </Field>

          <Field>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full font-mono"
            >
              {isPending ? (
                <>
                  <RiLoader4Line className="mr-2 size-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </Field>

          <FieldSeparator className="font-mono text-xs">Or continue with</FieldSeparator>

          <OAuthProviders />
        </FieldGroup>
      </form>

      <FieldDescription className="px-6 text-center font-mono text-xs text-muted-foreground">
        By clicking continue, you agree to the{" "}
        <a href="#" className="underline underline-offset-4 hover:text-primary">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="#" className="underline underline-offset-4 hover:text-primary">
          Privacy Policy
        </a>
        .
      </FieldDescription>
    </div>
  )
}
