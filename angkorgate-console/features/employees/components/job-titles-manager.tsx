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
import { Badge } from "@/components/ui/badge"
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
  RiSuitcaseLine,
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiLoader4Line,
} from "@remixicon/react"
import type { JobTitle, Department } from "../types/employees.types"
import {
  createJobTitleAction,
  updateJobTitleAction,
  deleteJobTitleAction,
} from "../server/employees-actions"

interface JobTitlesManagerProps {
  jobTitles: JobTitle[]
  departments: Department[]
}

export function JobTitlesManager({ jobTitles, departments }: JobTitlesManagerProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [createCode, setCreateCode] = useState("")
  const [createName, setCreateName] = useState("")
  const [createCategory, setCreateCategory] = useState("CLINIC")
  const [createDept, setCreateDept] = useState("")
  const [createDesc, setCreateDesc] = useState("")
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [editJt, setEditJt] = useState<JobTitle | null>(null)
  const [editName, setEditName] = useState("")
  const [editCategory, setEditCategory] = useState("CLINIC")
  const [editDept, setEditDept] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editLoading, setEditLoading] = useState(false)

  const [deletingCode, setDeletingCode] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError(null)

    const res = await createJobTitleAction({
      code: createCode.trim().toUpperCase(),
      name: createName.trim(),
      category: createCategory,
      description: createDesc.trim() || undefined,
    })

    setCreateLoading(false)
    if (res.success) {
      setCreateOpen(false)
      setCreateCode("")
      setCreateName("")
      setCreateDesc("")
    } else {
      setCreateError(res.message || "Failed to create job title")
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editJt) return
    setEditLoading(true)

    const res = await updateJobTitleAction(editJt.code, {
      name: editName.trim(),
      category: editCategory,
      description: editDesc.trim() || undefined,
    })

    setEditLoading(false)
    if (res.success) {
      setEditJt(null)
    }
  }

  const handleDelete = async (code: string) => {
    if (!confirm(`Are you sure you want to delete job title "${code}"?`)) return
    setDeletingCode(code)
    try {
      await deleteJobTitleAction(code)
    } finally {
      setDeletingCode(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-heading text-base font-semibold">Job Titles & Designations</h3>
          <p className="font-mono text-xs text-muted-foreground">
            Manage professional roles and staff designations.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger
            render={
              <Button size="sm" className="font-mono text-xs">
                <RiAddLine className="mr-1.5 size-4" /> Add Job Title
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle className="font-heading text-lg">Create Job Title</DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  Define an employee job title or designation.
                </DialogDescription>
              </DialogHeader>

              {createError && (
                <div className="font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md my-2 border border-destructive/20">
                  {createError}
                </div>
              )}

              <div className="grid gap-3.5 py-4 font-mono text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="jt-code">Job Title Code *</Label>
                    <Input
                      id="jt-code"
                      placeholder="e.g. NURSE"
                      value={createCode}
                      onChange={(e) => setCreateCode(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="jt-category">Category</Label>
                    <select
                      id="jt-category"
                      value={createCategory}
                      onChange={(e) => setCreateCategory(e.target.value)}
                      className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background/90 dark:bg-black/25 px-3 py-1.5 text-xs font-mono text-foreground transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 outline-none"
                    >
                      <option value="CLINIC">CLINIC</option>
                      <option value="HOTEL">HOTEL</option>
                      <option value="POS">POS</option>
                      <option value="GENERAL">GENERAL</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="jt-name">Display Name *</Label>
                  <Input
                    id="jt-name"
                    placeholder="e.g. Registered Nurse"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="jt-dept">Department Association</Label>
                  <select
                    id="jt-dept"
                    value={createDept}
                    onChange={(e) => setCreateDept(e.target.value)}
                    className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background/90 dark:bg-black/25 px-3 py-1.5 text-xs font-mono text-foreground transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 outline-none"
                  >
                    <option value="">None (Universal)</option>
                    {departments.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="jt-desc">Description</Label>
                  <Input
                    id="jt-desc"
                    placeholder="Job responsibilities or scope"
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
                    "Create Job Title"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {jobTitles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-10 text-center bg-card">
          <RiSuitcaseLine className="size-8 text-muted-foreground/60 mb-2" />
          <h4 className="font-heading text-sm font-semibold">No Job Titles Defined</h4>
          <p className="font-mono text-xs text-muted-foreground max-w-sm mt-1">
            Add job titles or seed templates to assign professional roles to employees.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-mono text-xs">Code</TableHead>
                <TableHead className="font-mono text-xs">Title Name</TableHead>
                <TableHead className="font-mono text-xs">Category</TableHead>
                <TableHead className="font-mono text-xs">Department</TableHead>
                <TableHead className="font-mono text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobTitles.map((jt) => (
                <TableRow key={jt.code} className="font-mono text-xs">
                  <TableCell className="font-bold text-primary">{jt.code}</TableCell>
                  <TableCell className="font-sans text-sm font-medium">{jt.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {jt.category || "GENERAL"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {jt.departmentCode || "Universal"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => {
                          setEditJt(jt)
                          setEditName(jt.name)
                          setEditCategory(jt.category || "CLINIC")
                          setEditDept(jt.departmentCode || "")
                          setEditDesc(jt.description || "")
                        }}
                      >
                        <RiEditLine className="size-3.5" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        disabled={deletingCode === jt.code}
                        onClick={() => handleDelete(jt.code)}
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

      {/* Edit Job Title Dialog */}
      {editJt && (
        <Dialog open={Boolean(editJt)} onOpenChange={(open) => !open && setEditJt(null)}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleEditSubmit}>
              <DialogHeader>
                <DialogTitle className="font-heading text-lg">Edit Job Title</DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  Update designation details for {editJt.code}.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3.5 py-4 font-mono text-xs">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-jt-name">Display Name</Label>
                  <Input
                    id="edit-jt-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="edit-jt-cat">Category</Label>
                    <select
                      id="edit-jt-cat"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background/90 dark:bg-black/25 px-3 py-1.5 text-xs font-mono text-foreground transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 outline-none"
                    >
                      <option value="CLINIC">CLINIC</option>
                      <option value="HOTEL">HOTEL</option>
                      <option value="POS">POS</option>
                      <option value="GENERAL">GENERAL</option>
                    </select>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="edit-jt-dept">Department</Label>
                    <select
                      id="edit-jt-dept"
                      value={editDept}
                      onChange={(e) => setEditDept(e.target.value)}
                      className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background/90 dark:bg-black/25 px-3 py-1.5 text-xs font-mono text-foreground transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 outline-none"
                    >
                      <option value="">Universal</option>
                      {departments.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="edit-jt-desc">Description</Label>
                  <Input
                    id="edit-jt-desc"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditJt(null)}
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
