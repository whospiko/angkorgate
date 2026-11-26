"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  RiApps2Line,
  RiDeleteBinLine,
  RiFileList3Line,
  RiKey2Line,
  RiKeyboardBoxLine,
  RiQuestionLine,
  RiSearchLine,
  RiServerLine,
  RiUserSearchLine,
} from "@remixicon/react"

const SHORTCUTS = [
  { keys: ["⌘ K", "Ctrl K"], label: "Open or close Command Palette" },
  { keys: ["↑", "↓"], label: "Move selection up / down" },
  { keys: ["↵ Enter"], label: "Jump to item or run action" },
  { keys: ["ESC"], label: "Close modal" },
]

const CAPABILITIES = [
  {
    icon: <RiUserSearchLine className="size-4 text-primary" />,
    title: "Search Users by Email or ID",
    description:
      "Type part of an email (e.g. admin) or paste a full/partial user UUID to jump directly to /users/<id>.",
  },
  {
    icon: <RiApps2Line className="size-4 text-primary" />,
    title: "Jump to Apps, Audit Logs & Settings",
    description:
      "Type apps (or a client app name/code), audit, or settings to navigate straight to /apps, /audit, or /settings/*.",
  },
]

const QUICK_ACTIONS = [
  {
    icon: <RiKey2Line className="size-4 text-primary" />,
    title: "Create API Key",
    badge: "Navigate + Open",
    description:
      "Jumps to /api-keys and opens the Create API Key wizard immediately (works from any page).",
  },
  {
    icon: <RiServerLine className="size-4 text-amber-500" />,
    title: "Toggle Maintenance Mode",
    badge: "Live Safeguard",
    description:
      "Pauses public registration & OAuth/OIDC flows with HTTP 503 while keeping Admin Console access active.",
  },
  {
    icon: <RiDeleteBinLine className="size-4 text-rose-500" />,
    title: "Purge Redis Cache",
    badge: "Audited",
    description:
      "Flushes Redis & in-memory cache keys and records a system.cache.purged audit event.",
  },
]

export function CommandPaletteHelpButton() {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const handleOpen = () => setOpen(true)
    window.addEventListener("angkorgate:open-command-help", handleOpen)
    return () => {
      window.removeEventListener("angkorgate:open-command-help", handleOpen)
    }
  }, [])

  const launchPalette = () => {
    setOpen(false)
    window.dispatchEvent(new CustomEvent("angkorgate:open-command-palette"))
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setOpen(true)}
              aria-label="Command Palette Help"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            />
          }
        >
          <RiQuestionLine className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-mono text-xs">
          Command Palette Guide (⌘K)
        </TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto border border-border bg-popover p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <RiKeyboardBoxLine className="size-4" />
              </span>
              <div>
                <DialogTitle className="font-heading text-lg font-bold">
                  Command Palette Guide
                </DialogTitle>
                <DialogDescription className="font-mono text-xs text-muted-foreground">
                  Quick reference for keyboard navigation, search, and live actions.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Keyboard Shortcuts */}
            <section className="space-y-2">
              <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Keyboard Shortcuts
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SHORTCUTS.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
                  >
                    <span className="font-mono text-xs text-foreground">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Search & Navigation */}
            <section className="space-y-2">
              <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Search & Direct Navigation
              </h3>
              <div className="space-y-2">
                {CAPABILITIES.map((cap) => (
                  <div
                    key={cap.title}
                    className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3"
                  >
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background">
                      {cap.icon}
                    </span>
                    <div className="space-y-0.5">
                      <div className="font-mono text-xs font-semibold text-foreground">
                        {cap.title}
                      </div>
                      <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                        {cap.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Quick Actions */}
            <section className="space-y-2">
              <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Quick Actions
              </h3>
              <div className="space-y-2">
                {QUICK_ACTIONS.map((action) => (
                  <div
                    key={action.title}
                    className="flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3"
                  >
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background">
                      {action.icon}
                    </span>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {action.title}
                        </span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {action.badge}
                        </Badge>
                      </div>
                      <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4 mt-2">
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <RiFileList3Line className="size-3.5" />
              Admin actions are logged to Audit Logs
            </span>
            <Button
              type="button"
              size="sm"
              onClick={launchPalette}
              className="gap-1.5 font-mono text-xs"
            >
              <RiSearchLine className="size-3.5" />
              Open ⌘K Palette
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
