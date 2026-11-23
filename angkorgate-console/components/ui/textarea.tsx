import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full resize-y rounded-[var(--radius)] border border-input/60 bg-input/40 px-3.5 py-2 text-xs font-mono text-foreground transition-all outline-none placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-black/30 dark:border-input/80 dark:focus-visible:border-primary dark:focus-visible:ring-primary/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
