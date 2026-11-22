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
import { RiEditLine, RiLoader4Line } from "@remixicon/react"
import type { Role } from "../types/rbac.types"
import { updateRoleAction } from "../server/rbac-actions"

interface EditRoleDialogProps {
  role: Role
  trigger?: React.ReactElement
}

export function EditRoleDialog({ role, trigger }: EditRoleDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(role.name)
  const [description, setDescription] = useState(role.description || "")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await updateRoleAction(role.id, {
      name,
      description,
    })

    setLoading(false)
    if (res.success) {
      setOpen(false)
    } else {
      setError(res.message || "Failed to update role")
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setName(role.name)
      setDescription(role.description || "")
      setError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          trigger ? (
            trigger
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
            >
              <RiEditLine className="size-4" />
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">Edit Role</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Update role display name and description.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md my-2 border border-destructive/20">
              {error}
            </div>
          )}

          <div className="grid gap-4 py-4 font-mono text-xs">
            <div className="grid gap-2">
              <Label>Role Code</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {role.code}
                </Badge>
                {role.isSystem && (
                  <Badge variant="secondary" className="font-mono text-[10px] text-primary">
                    SYSTEM PROTECTED
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-role-name">Role Name</Label>
              <Input
                id="edit-role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-role-desc">Description</Label>
              <Input
                id="edit-role-desc"
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
            <Button type="submit" size="sm" disabled={loading} className="font-mono text-xs">
              {loading ? (
                <>
                  <RiLoader4Line className="mr-1.5 size-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
