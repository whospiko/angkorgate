"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  RiAlertLine,
  RiApps2Line,
  RiCheckLine,
  RiCornerDownLeftLine,
  RiDashboardLine,
  RiDeleteBinLine,
  RiFileList3Line,
  RiFingerprintLine,
  RiKey2Line,
  RiLoader4Line,
  RiLockLine,
  RiMailSendLine,
  RiPaletteLine,
  RiSearchLine,
  RiServerLine,
  RiSettings3Line,
  RiShieldCheckLine,
  RiShieldKeyholeLine,
  RiUserLine,
} from "@remixicon/react"
import {
  getMaintenanceModeAction,
  purgeCacheAction,
  toggleMaintenanceModeAction,
} from "@/features/system"
import { searchCommandPaletteAction } from "../server/command-palette-actions"
import {
  filterStaticCommands,
  STATIC_COMMAND_ENTRIES,
  type CommandAppMatch,
  type CommandUserMatch,
  type StaticCommandEntry,
} from "../types/command-palette.types"

interface PaletteRow {
  id: string
  section: "users" | "apps" | "actions" | "navigation"
  title: string
  subtitle: string
  badge?: string
  badgeVariant?: "outline" | "secondary" | "destructive"
  icon: React.ReactNode
  onSelect: () => void | Promise<void>
}

function getStaticIcon(entry: StaticCommandEntry): React.ReactNode {
  switch (entry.id) {
    case "action:create-api-key":
      return <RiKey2Line className="size-4 text-primary" />
    case "action:toggle-maintenance":
      return <RiServerLine className="size-4 text-amber-500" />
    case "action:purge-cache":
      return <RiDeleteBinLine className="size-4 text-rose-500" />
    case "nav:apps":
      return <RiApps2Line className="size-4 text-muted-foreground" />
    case "nav:audit":
      return <RiFileList3Line className="size-4 text-muted-foreground" />
    case "nav:settings-environment":
      return <RiSettings3Line className="size-4 text-muted-foreground" />
    case "nav:settings-content":
      return <RiPaletteLine className="size-4 text-muted-foreground" />
    case "nav:settings-dev-inbox":
      return <RiMailSendLine className="size-4 text-muted-foreground" />
    case "nav:users":
      return <RiUserLine className="size-4 text-muted-foreground" />
    case "nav:api-keys":
      return <RiKey2Line className="size-4 text-muted-foreground" />
    case "nav:rbac":
      return <RiShieldKeyholeLine className="size-4 text-muted-foreground" />
    case "nav:oauth-providers":
      return <RiLockLine className="size-4 text-muted-foreground" />
    case "nav:oidc":
      return <RiFingerprintLine className="size-4 text-muted-foreground" />
    case "nav:dashboard":
      return <RiDashboardLine className="size-4 text-muted-foreground" />
    default:
      return <RiShieldCheckLine className="size-4 text-muted-foreground" />
  }
}

export function CommandPalette({
  initialMaintenanceMode = false,
}: {
  initialMaintenanceMode?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()

  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [actionBusy, setActionBusy] = React.useState<string | null>(null)
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [maintenanceMode, setMaintenanceMode] = React.useState(
    initialMaintenanceMode
  )
  const [users, setUsers] = React.useState<CommandUserMatch[]>([])
  const [apps, setApps] = React.useState<CommandAppMatch[]>([])
  const [activeIndex, setActiveIndex] = React.useState(0)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setFeedback(null)
    } else {
      setActiveIndex(0)
    }
  }, [])

  // Global Cmd+K / Ctrl+K and custom event listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((prev) => {
          const next = !prev
          if (!next) {
            setFeedback(null)
          } else {
            setActiveIndex(0)
          }
          return next
        })
      }
    }
    const handleCustomOpen = () => handleOpenChange(true)

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("angkorgate:open-command-palette", handleCustomOpen)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener(
        "angkorgate:open-command-palette",
        handleCustomOpen
      )
    }
  }, [handleOpenChange])

  // Refresh maintenance status when opened
  React.useEffect(() => {
    if (!open) return
    void getMaintenanceModeAction().then((res) => {
      setMaintenanceMode(res.maintenanceMode)
    })
  }, [open])

  // Debounced search for users (by email or ID) and client apps
  React.useEffect(() => {
    if (!open) return

    let cancelled = false
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await searchCommandPaletteAction(query)
        if (!cancelled) {
          setUsers(res.users)
          setApps(res.apps)
          setActiveIndex(0)
        }
      } catch {
        if (!cancelled) {
          setUsers([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }, query.trim() ? 180 : 0)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, open])

  const runAction = React.useCallback(
    async (entry: StaticCommandEntry) => {
      if (entry.href) {
        setOpen(false)
        setQuery("")
        router.push(entry.href)
        return
      }

      if (entry.actionId === "create-api-key") {
        setOpen(false)
        setQuery("")
        if (pathname === "/api-keys") {
          window.dispatchEvent(new CustomEvent("angkorgate:open-create-api-key"))
        } else {
          router.push("/api-keys?create=1")
        }
        return
      }

      if (entry.actionId === "toggle-maintenance") {
        setActionBusy(entry.id)
        setFeedback(null)
        const next = !maintenanceMode
        const res = await toggleMaintenanceModeAction(next)
        setActionBusy(null)
        if (res.success) {
          setMaintenanceMode(res.maintenanceMode)
          setFeedback({ type: "success", message: res.message })
          router.refresh()
        } else {
          setFeedback({ type: "error", message: res.message })
        }
        return
      }

      if (entry.actionId === "purge-cache") {
        setActionBusy(entry.id)
        setFeedback(null)
        const res = await purgeCacheAction()
        setActionBusy(null)
        setFeedback({
          type: res.success ? "success" : "error",
          message: res.message,
        })
      }
    },
    [maintenanceMode, pathname, router]
  )

  const filteredStatic = React.useMemo(
    () => filterStaticCommands(STATIC_COMMAND_ENTRIES, query),
    [query]
  )

  const rows: PaletteRow[] = React.useMemo(() => {
    const result: PaletteRow[] = []

    for (const user of users) {
      result.push({
        id: `user:${user.id}`,
        section: "users",
        title: user.email || user.fullName || user.id,
        subtitle: user.fullName
          ? `${user.fullName} · ${user.id}`
          : user.id,
        badge: user.isActive ? "Active" : "Suspended",
        badgeVariant: user.isActive ? "outline" : "destructive",
        icon: <RiUserLine className="size-4 text-primary" />,
        onSelect: () => {
          setOpen(false)
          setQuery("")
          router.push(`/users/${user.id}`)
        },
      })
    }

    for (const app of apps) {
      result.push({
        id: `app:${app.appCode}`,
        section: "apps",
        title: app.name,
        subtitle: app.rootUrl ? `${app.appCode} · ${app.rootUrl}` : app.appCode,
        badge: app.isPublicClient ? "Public" : "Confidential",
        badgeVariant: app.isPublicClient ? "outline" : "secondary",
        icon: <RiApps2Line className="size-4 text-primary" />,
        onSelect: () => {
          setOpen(false)
          setQuery("")
          router.push(`/apps?search=${encodeURIComponent(app.appCode)}`)
        },
      })
    }

    for (const entry of filteredStatic.filter((e) => e.group === "action")) {
      const isMaintenance = entry.actionId === "toggle-maintenance"
      result.push({
        id: entry.id,
        section: "actions",
        title: entry.title,
        subtitle: entry.subtitle,
        badge: isMaintenance
          ? maintenanceMode
            ? "ON"
            : "OFF"
          : "Action",
        badgeVariant: isMaintenance && maintenanceMode ? "destructive" : "outline",
        icon: getStaticIcon(entry),
        onSelect: () => runAction(entry),
      })
    }

    for (const entry of filteredStatic.filter((e) => e.group === "navigation")) {
      result.push({
        id: entry.id,
        section: "navigation",
        title: entry.title,
        subtitle: entry.subtitle,
        icon: getStaticIcon(entry),
        onSelect: () => runAction(entry),
      })
    }

    return result
  }, [apps, filteredStatic, maintenanceMode, router, runAction, users])

  const safeActiveIndex =
    rows.length === 0 ? 0 : Math.min(activeIndex, rows.length - 1)

  // Scroll active item into view
  React.useEffect(() => {
    const activeEl = listRef.current?.querySelector(
      `[data-palette-index="${safeActiveIndex}"]`
    )
    if (activeEl instanceof HTMLElement) {
      activeEl.scrollIntoView({ block: "nearest" })
    }
  }, [safeActiveIndex])

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (rows.length > 0) {
        setActiveIndex((prev) => (prev + 1) % rows.length)
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (rows.length > 0) {
        setActiveIndex((prev) => (prev - 1 + rows.length) % rows.length)
      }
    } else if (e.key === "Enter") {
      e.preventDefault()
      const selected = rows[safeActiveIndex]
      if (selected) {
        void selected.onSelect()
      }
    }
  }

  const sections: {
    key: PaletteRow["section"]
    label: string
    items: (PaletteRow & { flatIndex: number })[]
  }[] = React.useMemo(() => {
    const sectionOrder: { key: PaletteRow["section"]; label: string }[] = [
      { key: "users", label: "Users" },
      { key: "apps", label: "Client Applications" },
      { key: "actions", label: "Quick Actions" },
      { key: "navigation", label: "Jump To" },
    ]
    return sectionOrder
      .map((sec) => {
        const items = rows
          .map((row, idx) => ({ ...row, flatIndex: idx }))
          .filter((row) => row.section === sec.key)
        return { ...sec, items }
      })
      .filter((sec) => sec.items.length > 0)
  }, [rows])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-2xl p-0 gap-0 overflow-hidden border border-border bg-popover shadow-2xl"
      >
        <DialogTitle className="sr-only">Global Command Palette</DialogTitle>

        {/* Search Input Header */}
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <RiSearchLine className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search users by email or ID, client apps, or run an action..."
            aria-label="Command palette search"
            className="flex-1 bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {loading ? (
            <RiLoader4Line className="size-4 shrink-0 animate-spin text-primary" />
          ) : (
            <kbd className="hidden sm:inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              ESC
            </kbd>
          )}
        </div>

        {/* Inline Action Feedback */}
        {feedback && (
          <div
            className={`flex items-center gap-2 border-b border-border px-4 py-2 font-mono text-xs ${
              feedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {feedback.type === "success" ? (
              <RiCheckLine className="size-4 shrink-0" />
            ) : (
              <RiAlertLine className="size-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Results List */}
        <div
          ref={listRef}
          role="listbox"
          className="max-h-[400px] overflow-y-auto p-2 space-y-3"
        >
          {sections.length === 0 ? (
            <div className="py-10 text-center font-mono text-xs text-muted-foreground">
              {loading
                ? "Searching AngkorGate..."
                : `No matching users, apps, or commands for "${query}".`}
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.key} className="space-y-1">
                <div className="px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {section.label}
                </div>
                {section.items.map((item) => {
                  const isActive = item.flatIndex === safeActiveIndex
                  const isBusy = actionBusy === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      data-palette-index={item.flatIndex}
                      onMouseEnter={() => setActiveIndex(item.flatIndex)}
                      onClick={() => void item.onSelect()}
                      disabled={isBusy}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                        isActive
                          ? "bg-primary/15 text-foreground"
                          : "text-foreground/90 hover:bg-muted/60"
                      }`}
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background">
                        {isBusy ? (
                          <RiLoader4Line className="size-4 animate-spin text-primary" />
                        ) : (
                          item.icon
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-mono text-xs font-semibold">
                          {item.title}
                        </div>
                        <div className="truncate font-mono text-[11px] text-muted-foreground">
                          {item.subtitle}
                        </div>
                      </div>
                      {item.badge && (
                        <Badge
                          variant={item.badgeVariant ?? "outline"}
                          className="shrink-0 font-mono text-[10px]"
                        >
                          {item.badge}
                        </Badge>
                      )}
                      {isActive && (
                        <RiCornerDownLeftLine className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer Hints */}
        <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2 font-mono text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Maintenance:</span>
            <span
              className={
                maintenanceMode ? "text-amber-500 font-semibold" : "text-emerald-500"
              }
            >
              {maintenanceMode ? "ON" : "OFF"}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
