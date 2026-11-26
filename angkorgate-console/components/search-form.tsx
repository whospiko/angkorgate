"use client"

import { RiSearchLine } from "@remixicon/react"
import { cn } from "cn"

export function SearchForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const openPalette = () => {
    window.dispatchEvent(new CustomEvent("angkorgate:open-command-palette"))
  }

  return (
    <div className={cn(className)} {...props}>
      <button
        type="button"
        onClick={openPalette}
        className="flex h-8 w-full sm:w-64 items-center justify-between gap-2 rounded-md border border-input bg-background px-2.5 text-xs font-mono text-muted-foreground shadow-xs transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex items-center gap-2 truncate">
          <RiSearchLine className="size-3.5 shrink-0 opacity-60" />
          <span className="truncate">Search or jump to...</span>
        </span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </button>
    </div>
  )
}
