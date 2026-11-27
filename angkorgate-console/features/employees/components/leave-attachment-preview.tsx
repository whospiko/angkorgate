"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RiAttachmentLine, RiDownload2Line } from "@remixicon/react"

interface LeaveAttachmentPreviewProps {
  name?: string | null
  mimeType?: string | null
  dataUrl: string
}

export function LeaveAttachmentPreview({
  name,
  mimeType,
  dataUrl,
}: LeaveAttachmentPreviewProps) {
  const [open, setOpen] = useState(false)
  const isPdf =
    mimeType === "application/pdf" || dataUrl.startsWith("data:application/pdf")
  const displayName = name || "Leave Attachment"

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] font-mono text-primary hover:underline cursor-pointer"
        title="Preview attachment"
      >
        <RiAttachmentLine className="size-3 shrink-0" />
        <span className="truncate max-w-[160px]">{displayName}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-heading text-base truncate pr-6">
              {displayName}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto rounded-md border border-border/50 bg-muted/20 p-2 flex items-center justify-center">
            {isPdf ? (
              <iframe
                src={dataUrl}
                title={displayName}
                className="w-full h-[65vh] rounded border-0 bg-white"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={dataUrl}
                alt={displayName}
                className="max-h-[65vh] w-auto rounded object-contain"
              />
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="font-mono text-xs"
            >
              Close
            </Button>
            <a
              href={dataUrl}
              download={name || "leave-attachment"}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-mono text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RiDownload2Line className="size-3.5" />
              Download
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
