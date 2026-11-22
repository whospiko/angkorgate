"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { RiAddLine, RiLoader4Line, RiShieldCheckLine } from "@remixicon/react"
import { createPermissionAction } from "../server/rbac-actions"

export function CreatePermissionDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [resource, setResource] = useState("")
  const [action, setAction] = useState("")
  const [description, setDescription] = useState("")

  // Computed code: resource:action
  const computedCode =
    resource.trim() && action.trim()
      ? `${resource.trim().toLowerCase()}:${action.trim().toLowerCase()}`
      : ""

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const cleanResource = resource.trim().toLowerCase()
    const cleanAction = action.trim().toLowerCase()

    const res = await createPermissionAction({
      code: `${cleanResource}:${cleanAction}`,
      resource: cleanResource,
      action: cleanAction,
      description: description.trim() || undefined,
    })

    setLoading(false)
    if (res.success) {
      setOpen(false)
      setResource("")
      setAction("")
      setDescription("")
    } else {
      setError(res.message || "Failed to create permission")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="font-mono text-xs">
            <RiAddLine className="mr-1.5 size-4" /> Create Permission
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-heading text-lg flex items-center gap-2">
              <RiShieldCheckLine className="size-5 text-primary" />
              Define RBAC Permission
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Register a granular resource:action permission in the security catalog.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md my-2 border border-destructive/20">
              {error}
            </div>
          )}

          <div className="grid gap-4 py-4 font-mono text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="perm-resource">Resource Module</Label>
                <Input
                  id="perm-resource"
                  placeholder="patient"
                  value={resource}
                  onChange={(e) => setResource(e.target.value.toLowerCase())}
                  required
                />
                <span className="text-[10px] text-muted-foreground">
                  e.g. user, patient, billing
                </span>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="perm-action">Action Allowed</Label>
                <Input
                  id="perm-action"
                  placeholder="read"
                  value={action}
                  onChange={(e) => setAction(e.target.value.toLowerCase())}
                  required
                />
                <span className="text-[10px] text-muted-foreground">
                  e.g. read, write, delete, export
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Permission Code Preview</Label>
              <div className="p-2.5 rounded-md border border-border/60 bg-muted/30 flex items-center justify-between">
                <span className="text-muted-foreground">Generated Code:</span>
                <Badge
                  variant={computedCode ? "default" : "outline"}
                  className="font-mono text-xs"
                >
                  {computedCode || "resource:action"}
                </Badge>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="perm-desc">Human Description</Label>
              <Input
                id="perm-desc"
                placeholder="Allows querying medical histories and clinical notes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="font-mono text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !computedCode}
              className="font-mono text-xs"
            >
              {loading ? (
                <>
                  <RiLoader4Line className="mr-1.5 size-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Permission"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
