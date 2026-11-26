import * as React from "react"
import Link from "next/link"
import {
  RiArrowLeftLine,
  RiFileTextLine,
  RiShieldCheckLine,
  RiMailLine,
} from "@remixicon/react"
import { BrandLogo } from "@/features/system"
import { Badge } from "@/components/ui/badge"

export interface LegalSection {
  id: string
  title: string
  content: React.ReactNode
}

export interface LegalDocumentLayoutProps {
  kind: "terms" | "privacy"
  title: string
  subtitle: string
  effectiveDate: string
  appName: string
  logoUrl?: string | null
  organizationName?: string | null
  supportEmail?: string | null
  footerText?: string | null
  sections: LegalSection[]
}

export function LegalDocumentLayout({
  kind,
  title,
  subtitle,
  effectiveDate,
  appName,
  logoUrl,
  organizationName,
  supportEmail,
  footerText,
  sections,
}: LegalDocumentLayoutProps) {
  const org = organizationName || `${appName} Maintainers`
  const otherKind = kind === "terms" ? "privacy" : "terms"
  const otherHref = kind === "terms" ? "/privacy" : "/terms"
  const otherLabel = kind === "terms" ? "Privacy Policy" : "Terms of Service"

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/login" className="flex items-center gap-2.5 group">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs overflow-hidden">
              <BrandLogo
                logoUrl={logoUrl}
                alt={appName}
                customClassName="size-5 object-contain"
              />
            </div>
            <span className="font-heading text-sm font-bold tracking-wide">
              {appName}
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href={otherHref}
              className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {otherLabel}
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-1.5 font-mono text-xs font-medium text-foreground hover:bg-muted/60 transition-colors"
            >
              <RiArrowLeftLine className="size-3.5" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="space-y-8">
          {/* Document Hero */}
          <div className="rounded-xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="font-mono text-[11px] bg-primary/10 text-primary border-primary/30 gap-1"
              >
                {kind === "terms" ? (
                  <RiFileTextLine className="size-3" />
                ) : (
                  <RiShieldCheckLine className="size-3" />
                )}
                Open-Source IAM Legal Notice
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">
                Effective: {effectiveDate}
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {subtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border/50 pt-4 font-mono text-xs text-muted-foreground">
              <span>
                Operator: <strong className="text-foreground">{org}</strong>
              </span>
              {supportEmail && (
                <a
                  href={`mailto:${supportEmail}`}
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <RiMailLine className="size-3.5" />
                  {supportEmail}
                </a>
              )}
              <span>
                Related:{" "}
                <Link href={otherHref} className="text-primary hover:underline">
                  {otherLabel}
                </Link>
              </span>
            </div>
          </div>

          {/* Quick Section Navigation */}
          <nav
            aria-label="Table of contents"
            className="rounded-xl border border-border/50 bg-muted/20 p-4 sm:p-5"
          >
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Contents
            </p>
            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-xs">
              {sections.map((section, idx) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {idx + 1}. {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* Sections */}
          <div className="space-y-6">
            {sections.map((section, idx) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 rounded-xl border border-border/60 bg-card p-6 sm:p-7 space-y-3"
              >
                <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
                  <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/15 font-mono text-xs font-bold text-primary">
                    {idx + 1}
                  </span>
                  {section.title}
                </h2>
                <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
                  {section.content}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-card/50 py-6">
        <div className="mx-auto flex max-w-4xl flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 font-mono text-xs text-muted-foreground">
          <span>{footerText || `© ${new Date().getFullYear()} ${org}`}</span>
          <div className="flex items-center gap-4">
            <Link
              href="/terms"
              className={
                kind === "terms"
                  ? "text-foreground font-semibold"
                  : "hover:text-primary transition-colors"
              }
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className={
                otherKind === "terms"
                  ? "text-foreground font-semibold"
                  : "hover:text-primary transition-colors"
              }
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
