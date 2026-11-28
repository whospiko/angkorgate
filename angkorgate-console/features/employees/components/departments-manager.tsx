"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  RiCommunityLine,
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiLoader4Line,
} from "@remixicon/react"
import type { Department } from "../types/employees.types"
import {
  createDepartmentAction,
  updateDepartmentAction,
  deleteDepartmentAction,
} from "../server/employees-actions"

interface DepartmentsManagerProps {
  departments: Department[]
}

export function DepartmentsManager({ departments }: DepartmentsManagerProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [createCode, setCreateCode] = useState("")
  const [createName, setCreateName] = useState("")
  const [createDesc, setCreateDesc] = useState("")
  const [createParentId, setCreateParentId] = useState("")
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [editDept, setEditDept] = useState<Department | null>(null)
  const [editName, setEditName] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editParentId, setEditParentId] = useState("")
  const [editLoading, setEditLoading] = useState(false)

  const [deletingCode, setDeletingCode] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  )

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError(null)

    const res = await createDepartmentAction({
      code: createCode.trim().toUpperCase(),
      name: createName.trim(),
      description: createDesc.trim() || undefined,
      parentId: createParentId || null,
    })

    setCreateLoading(false)
    if (res.success) {
      setCreateOpen(false)
      setCreateCode("")
      setCreateName("")
      setCreateDesc("")
      setCreateParentId("")
    } else {
      setCreateError(res.message || "Failed to create department")
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editDept) return
    setEditLoading(true)

    const res = await updateDepartmentAction(editDept.code, {
      name: editName.trim(),
      description: editDesc.trim() || undefined,
      parentId: editParentId || null,
    })

    setEditLoading(false)
    if (res.success) {
      setEditDept(null)
    } else {
      setFeedback({ type: "error", message: res.message || "Failed to update department" })
    }
  }

  const handleDelete = async (code: string) => {
    if (!confirm(`Are you sure you want to delete department "${code}"?`)) return
    setDeletingCode(code)
    setFeedback(null)
    try {
      const res = await deleteDepartmentAction(code)
      if (!res.success) {
        setFeedback({ type: "error", message: res.message || "Failed to delete department" })
      }
    } finally {
      setDeletingCode(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-heading text-base font-semibold">Organizational Departments</h3>
          <p className="font-mono text-xs text-muted-foreground">
            Configure internal operational units and departments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Create Department Dialog */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger
              render={
                <Button size="sm" className="font-mono text-xs">
                  <RiAddLine className="mr-1.5 size-4" /> Add Department
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle className="font-heading text-lg">Create Department</DialogTitle>
                  <DialogDescription className="font-mono text-xs">
                    Define a new organizational department or branch.
                  </DialogDescription>
                </DialogHeader>

                {createError && (
                  <div className="font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md my-2 border border-destructive/20">
                    {createError}
                  </div>
                )}

                <div className="grid gap-3.5 py-4 font-mono text-xs">
                  <div className="grid gap-1.5">
                    <Label htmlFor="dept-code">Department Code *</Label>
                    <Input
                      id="dept-code"
                      placeholder="e.g. CARDIOLOGY"
                      value={createCode}
                      onChange={(e) => setCreateCode(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="dept-name">Department Name *</Label>
                    <Input
                      id="dept-name"
                      placeholder="e.g. Cardiology Department"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="dept-desc">Description</Label>
                    <Input
                      id="dept-desc"
                      placeholder="Optional notes or operational scope"
                      value={createDesc}
                      onChange={(e) => setCreateDesc(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="dept-parent">Parent Department</Label>
                    <select
                      id="dept-parent"
                      value={createParentId}
                      onChange={(e) => setCreateParentId(e.target.value)}
                      className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background/90 dark:bg-black/25 px-3 py-1.5 text-xs font-mono text-foreground outline-none"
                    >
                      <option value="">None (Top-level)</option>
                      {departments.filter((d) => d.id).map((d) => (
                        <option key={d.code} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateOpen(false)}
                    disabled={createLoading}
                    className="font-mono text-xs"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createLoading} className="font-mono text-xs">
                    {createLoading ? (
                      <>
                        <RiLoader4Line className="mr-1.5 size-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Department"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {feedback && (
        <div
          className={`font-mono text-xs p-2.5 rounded-md border ${
            feedback.type === "success"
              ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
              : "text-destructive bg-destructive/10 border-destructive/20"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {departments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-10 text-center bg-card">
          <RiCommunityLine className="size-8 text-muted-foreground/60 mb-2" />
          <h4 className="font-heading text-sm font-semibold">No Departments Configured</h4>
          <p className="font-mono text-xs text-muted-foreground max-w-sm mt-1">
            Click &quot;Seed Clinic&quot;, &quot;Seed Hotel&quot;, &quot;Seed POS&quot;, or &quot;Add Department&quot; above to initialize organizational units.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-mono text-xs">Department Code</TableHead>
                <TableHead className="font-mono text-xs">Department Name</TableHead>
                <TableHead className="font-mono text-xs">Description</TableHead>
                <TableHead className="font-mono text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((d) => (
                <TableRow key={d.code} className="font-mono text-xs">
                  <TableCell className="font-bold text-primary">{d.code}</TableCell>
                  <TableCell className="font-sans text-sm font-medium">{d.name}</TableCell>
                  <TableCell className="text-muted-foreground">{d.description || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => {
                          setEditDept(d)
                          setEditName(d.name)
                          setEditDesc(d.description || "")
                          setEditParentId(d.parentId || "")
                        }}
                      >
                        <RiEditLine className="size-3.5" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        disabled={deletingCode === d.code}
                        onClick={() => handleDelete(d.code)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <RiDeleteBinLine className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Department Dialog */}
      {editDept && (
        <Dialog open={Boolean(editDept)} onOpenChange={(open) => !open && setEditDept(null)}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleEditSubmit}>
              <DialogHeader>
                <DialogTitle className="font-heading text-lg">Edit Department</DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  Update department details for {editDept.code}.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3.5 py-4 font-mono text-xs">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-dept-name">Department Name</Label>
                  <Input
                    id="edit-dept-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="edit-dept-desc">Description</Label>
                  <Input
                    id="edit-dept-desc"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="edit-dept-parent">Parent Department</Label>
                  <select
                    id="edit-dept-parent"
                    value={editParentId}
                    onChange={(e) => setEditParentId(e.target.value)}
                    className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background/90 dark:bg-black/25 px-3 py-1.5 text-xs font-mono text-foreground outline-none"
                  >
                    <option value="">None (Top-level)</option>
                    {departments
                      .filter((d) => d.id && d.code !== editDept.code)
                      .map((d) => (
                        <option key={d.code} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDept(null)}
                  disabled={editLoading}
                  className="font-mono text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={editLoading} className="font-mono text-xs">
                  {editLoading ? (
                    <>
                      <RiLoader4Line className="mr-1.5 size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
