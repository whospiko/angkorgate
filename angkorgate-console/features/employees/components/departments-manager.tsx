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
  RiSeedlingLine,
  RiLoader4Line,
} from "@remixicon/react"
import type { Department } from "../types/employees.types"
import {
  createDepartmentAction,
  updateDepartmentAction,
  deleteDepartmentAction,
  seedDepartmentsAction,
} from "../server/employees-actions"

interface DepartmentsManagerProps {
  departments: Department[]
}

export function DepartmentsManager({ departments }: DepartmentsManagerProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [createCode, setCreateCode] = useState("")
  const [createName, setCreateName] = useState("")
  const [createDesc, setCreateDesc] = useState("")
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [editDept, setEditDept] = useState<Department | null>(null)
  const [editName, setEditName] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editLoading, setEditLoading] = useState(false)

  const [seeding, setSeeding] = useState<string | null>(null)
  const [deletingCode, setDeletingCode] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError(null)

    const res = await createDepartmentAction({
      code: createCode.trim().toUpperCase(),
      name: createName.trim(),
      description: createDesc.trim() || undefined,
    })

    setCreateLoading(false)
    if (res.success) {
      setCreateOpen(false)
      setCreateCode("")
      setCreateName("")
      setCreateDesc("")
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
    })

    setEditLoading(false)
    if (res.success) {
      setEditDept(null)
    }
  }

  const handleDelete = async (code: string) => {
    if (!confirm(`Are you sure you want to delete department "${code}"?`)) return
    setDeletingCode(code)
    try {
      await deleteDepartmentAction(code)
    } finally {
      setDeletingCode(null)
    }
  }

  const handleSeed = async (template: string) => {
    if (!confirm(`Seed standard ${template.toUpperCase()} department hierarchy? Existing departments will be preserved.`)) return
    setSeeding(template)
    try {
      await seedDepartmentsAction(template)
    } finally {
      setSeeding(null)
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

        <div className="flex items-center gap-2">
          {/* Seed Quick Actions */}
          <Button
            size="sm"
            variant="outline"
            disabled={Boolean(seeding)}
            onClick={() => handleSeed("clinic")}
            className="font-mono text-xs"
          >
            {seeding === "clinic" ? (
              <RiLoader4Line className="mr-1 size-3.5 animate-spin" />
            ) : (
              <RiSeedlingLine className="mr-1 size-3.5 text-primary" />
            )}
            Seed Clinic
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={Boolean(seeding)}
            onClick={() => handleSeed("hotel")}
            className="font-mono text-xs"
          >
            {seeding === "hotel" ? (
              <RiLoader4Line className="mr-1 size-3.5 animate-spin" />
            ) : (
              <RiSeedlingLine className="mr-1 size-3.5 text-primary" />
            )}
            Seed Hotel
          </Button>

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

      {departments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-10 text-center bg-card">
          <RiCommunityLine className="size-8 text-muted-foreground/60 mb-2" />
          <h4 className="font-heading text-sm font-semibold">No Departments Configured</h4>
          <p className="font-mono text-xs text-muted-foreground max-w-sm mt-1">
            Click &quot;Seed Clinic&quot; or &quot;Add Department&quot; above to initialize organizational units.
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
