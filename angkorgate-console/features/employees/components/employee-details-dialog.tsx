"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  RiUserLine,
  RiPhoneLine,
  RiMapPinLine,
  RiIdCardLine,
  RiCalendarLine,
  RiSuitcaseLine,
  RiTimeLine,
  RiAddLine,
  RiDeleteBinLine,
  RiLoader4Line,
  RiStarLine,
  RiEditLine,
  RiCheckLine,
  RiCloseLine,
  RiLink,
  RiLinkUnlink,
  RiSettings3Line,
} from "@remixicon/react"
import {
  updateEmployeeStatusAction,
  linkEmployeeUserAction,
  getEmployeePositions,
  assignPositionAction,
  updatePositionAction,
  removePositionAction,
  getPositionAttributes,
  setPositionAttributeAction,
  deletePositionAttributeAction,
  getEmployeeSchedules,
  createScheduleAction,
  updateScheduleAction,
  deleteScheduleAction,
} from "../server/employees-actions"
import type {
  Employee,
  EmployeePosition,
  EmployeeSchedule,
  EmploymentStatus,
  Department,
  JobTitle,
} from "../types/employees.types"

interface EmployeeDetailsDialogProps {
  employee: Employee
  departments: Department[]
  jobTitles: JobTitle[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

function parseAttributeInput(raw: string): unknown {
  const trimmed = raw.trim()
  if (trimmed === "true") return true
  if (trimmed === "false") return false
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
  if (
    (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
    (trimmed.startsWith("{") && trimmed.endsWith("}"))
  ) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return raw
    }
  }
  return raw
}

export function EmployeeDetailsDialog({
  employee,
  departments,
  jobTitles,
  open,
  onOpenChange,
}: EmployeeDetailsDialogProps) {
  const [status, setStatus] = useState<EmploymentStatus>(employee.employmentStatus || "ACTIVE")
  const [statusLoading, setStatusLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)

  // User linking
  const [linkedUserId, setLinkedUserId] = useState<string | null>(employee.userId ?? null)
  const [userIdInput, setUserIdInput] = useState(employee.userId ?? "")
  const [userLinkLoading, setUserLinkLoading] = useState(false)

  // Positions
  const [positions, setPositions] = useState<EmployeePosition[]>([])
  const [selectedJobTitle, setSelectedJobTitle] = useState("")
  const [selectedDept, setSelectedDept] = useState("")
  const [posLoading, setPosLoading] = useState(false)

  // Position attributes
  const [expandedPosId, setExpandedPosId] = useState<string | null>(null)
  const [posAttrs, setPosAttrs] = useState<Record<string, unknown>>({})
  const [attrKey, setAttrKey] = useState("")
  const [attrValue, setAttrValue] = useState("")
  const [attrLoading, setAttrLoading] = useState(false)

  // Schedules
  const [schedules, setSchedules] = useState<EmployeeSchedule[]>([])
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [startTime, setStartTime] = useState("08:00")
  const [endTime, setEndTime] = useState("17:00")
  const [schedLoading, setSchedLoading] = useState(false)

  // Schedule inline edit
  const [editingSchedId, setEditingSchedId] = useState<string | null>(null)
  const [editDay, setEditDay] = useState(1)
  const [editStart, setEditStart] = useState("08:00")
  const [editEnd, setEditEnd] = useState("17:00")
  const [editActive, setEditActive] = useState(true)

  useEffect(() => {
    if (open) {
      setFeedbackError(null)
      setStatus(employee.employmentStatus || "ACTIVE")
      setLinkedUserId(employee.userId ?? null)
      setUserIdInput(employee.userId ?? "")
      setExpandedPosId(null)
      getEmployeePositions(employee.id).then(setPositions)
      getEmployeeSchedules(employee.id).then(setSchedules)
      if (jobTitles.length > 0 && !selectedJobTitle) {
        setSelectedJobTitle(jobTitles[0].code)
      }
      if (departments.length > 0 && !selectedDept) {
        setSelectedDept(departments[0].code)
      }
    }
  }, [open, employee.id, employee.employmentStatus, employee.userId, jobTitles, departments, selectedJobTitle, selectedDept])

  const handleStatusChange = async (newStatus: EmploymentStatus) => {
    setFeedbackError(null)
    setStatusLoading(true)
    const res = await updateEmployeeStatusAction(employee.id, newStatus)
    setStatusLoading(false)
    if (res.success) {
      setStatus(newStatus)
    } else {
      setFeedbackError(res.message || "Failed to update employment status")
    }
  }

  const handleLinkUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userIdInput.trim()) return
    setFeedbackError(null)
    setUserLinkLoading(true)
    const res = await linkEmployeeUserAction(employee.id, userIdInput.trim())
    setUserLinkLoading(false)
    if (res.success) {
      setLinkedUserId(userIdInput.trim())
    } else {
      setFeedbackError(res.message || "Failed to link user account")
    }
  }

  const handleUnlinkUser = async () => {
    setFeedbackError(null)
    setUserLinkLoading(true)
    const res = await linkEmployeeUserAction(employee.id, null)
    setUserLinkLoading(false)
    if (res.success) {
      setLinkedUserId(null)
      setUserIdInput("")
    } else {
      setFeedbackError(res.message || "Failed to unlink user account")
    }
  }

  const handleAssignPosition = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJobTitle) return
    setFeedbackError(null)
    setPosLoading(true)
    const res = await assignPositionAction(employee.id, {
      jobTitleCode: selectedJobTitle,
      departmentCode: selectedDept || undefined,
      isPrimary: positions.length === 0,
    })
    setPosLoading(false)
    if (res.success) {
      const refreshed = await getEmployeePositions(employee.id)
      setPositions(refreshed)
    } else {
      setFeedbackError(res.message || "Failed to assign position")
    }
  }

  const handleSetPrimaryPosition = async (positionId: string) => {
    setFeedbackError(null)
    const res = await updatePositionAction(employee.id, positionId, { isPrimary: true })
    if (res.success) {
      const refreshed = await getEmployeePositions(employee.id)
      setPositions(refreshed)
    } else {
      setFeedbackError(res.message || "Failed to update primary position")
    }
  }

  const handleRemovePosition = async (positionId: string) => {
    setFeedbackError(null)
    const res = await removePositionAction(employee.id, positionId)
    if (res.success) {
      const refreshed = await getEmployeePositions(employee.id)
      setPositions(refreshed)
      if (expandedPosId === positionId) setExpandedPosId(null)
    } else {
      setFeedbackError(res.message || "Failed to remove position")
    }
  }

  const togglePositionAttributes = async (positionId: string) => {
    if (expandedPosId === positionId) {
      setExpandedPosId(null)
      return
    }
    setExpandedPosId(positionId)
    const attrs = await getPositionAttributes(employee.id, positionId)
    setPosAttrs(attrs)
  }

  const handleSetPositionAttribute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expandedPosId || !attrKey.trim()) return
    setFeedbackError(null)
    setAttrLoading(true)
    const parsedVal = parseAttributeInput(attrValue)
    const res = await setPositionAttributeAction(
      employee.id,
      expandedPosId,
      attrKey.trim(),
      parsedVal
    )
    setAttrLoading(false)
    if (res.success) {
      setPosAttrs((prev) => ({ ...prev, [attrKey.trim()]: parsedVal }))
      setAttrKey("")
      setAttrValue("")
    } else {
      setFeedbackError(res.message || "Failed to set position attribute")
    }
  }

  const handleDeletePositionAttribute = async (key: string) => {
    if (!expandedPosId) return
    setFeedbackError(null)
    const res = await deletePositionAttributeAction(employee.id, expandedPosId, key)
    if (res.success) {
      setPosAttrs((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    } else {
      setFeedbackError(res.message || "Failed to delete position attribute")
    }
  }

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedbackError(null)
    setSchedLoading(true)
    const res = await createScheduleAction(employee.id, {
      dayOfWeek,
      startTime,
      endTime,
      isActive: true,
    })
    setSchedLoading(false)
    if (res.success) {
      const refreshed = await getEmployeeSchedules(employee.id)
      setSchedules(refreshed)
    } else {
      setFeedbackError(res.message || "Failed to add schedule")
    }
  }

  const startEditSchedule = (s: EmployeeSchedule) => {
    setEditingSchedId(s.id)
    setEditDay(s.dayOfWeek)
    setEditStart(s.startTime.slice(0, 5))
    setEditEnd(s.endTime.slice(0, 5))
    setEditActive(s.isActive)
  }

  const handleSaveSchedule = async (scheduleId: string) => {
    setFeedbackError(null)
    const res = await updateScheduleAction(employee.id, scheduleId, {
      dayOfWeek: editDay,
      startTime: editStart,
      endTime: editEnd,
      isActive: editActive,
    })
    if (res.success) {
      const refreshed = await getEmployeeSchedules(employee.id)
      setSchedules(refreshed)
      setEditingSchedId(null)
    } else {
      setFeedbackError(res.message || "Failed to update schedule")
    }
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    setFeedbackError(null)
    const res = await deleteScheduleAction(employee.id, scheduleId)
    if (res.success) {
      setSchedules((prev) => prev.filter((s) => s.id !== scheduleId))
    } else {
      setFeedbackError(res.message || "Failed to delete schedule")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="font-heading text-lg flex items-center gap-2">
              <RiUserLine className="size-5 text-primary" />
              {employee.fullName}
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {employee.employeeCode}
            </Badge>
          </div>
          <DialogDescription className="font-mono text-xs">
            Employee UUID: {employee.id}
          </DialogDescription>
        </DialogHeader>

        {feedbackError && (
          <div className="font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/20">
            {feedbackError}
          </div>
        )}

        <div className="space-y-5 py-2 font-mono text-xs">
          {/* Status & User Link Bar */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
              <span className="text-muted-foreground">Status:</span>
              <div className="flex items-center gap-2">
                <select
                  value={status}
                  disabled={statusLoading}
                  onChange={(e) => handleStatusChange(e.target.value as EmploymentStatus)}
                  className="h-7 rounded-md border border-input bg-background/90 dark:bg-black/25 px-2 text-xs font-mono text-foreground focus-visible:border-primary outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ON_LEAVE">ON_LEAVE</option>
                  <option value="RESIGNED">RESIGNED</option>
                  <option value="TERMINATED">TERMINATED</option>
                </select>
                {statusLoading && <RiLoader4Line className="size-4 animate-spin text-primary" />}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border/50 bg-muted/20">
              {linkedUserId ? (
                <>
                  <div className="truncate">
                    <span className="text-muted-foreground">User: </span>
                    <Link
                      href={`/users/${linkedUserId}`}
                      className="text-primary hover:underline font-semibold"
                    >
                      {linkedUserId.slice(0, 8)}...
                    </Link>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={userLinkLoading}
                    onClick={handleUnlinkUser}
                    className="h-7 font-mono text-[11px] shrink-0"
                  >
                    <RiLinkUnlink className="mr-1 size-3.5" /> Unlink
                  </Button>
                </>
              ) : (
                <form onSubmit={handleLinkUser} className="flex w-full items-center gap-1.5">
                  <Input
                    placeholder="Link User UUID..."
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value)}
                    className="h-7 text-[11px] font-mono flex-1"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={userLinkLoading || !userIdInput.trim()}
                    className="h-7 font-mono text-[11px] shrink-0"
                  >
                    <RiLink className="mr-1 size-3.5" /> Link
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Core Info Grid */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border/50 bg-card">
            <div className="flex items-center gap-2 text-muted-foreground">
              <RiPhoneLine className="size-4 shrink-0 text-primary" />
              <span className="text-foreground">{employee.phone || "No phone"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <RiCalendarLine className="size-4 shrink-0 text-primary" />
              <span className="text-foreground">
                Hired: {employee.hireDate ? employee.hireDate.split("T")[0] : "Not recorded"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <RiIdCardLine className="size-4 shrink-0 text-primary" />
              <span className="text-foreground">{employee.nationalId || "No NID"}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <RiMapPinLine className="size-4 shrink-0 text-primary" />
              <span className="text-foreground truncate">{employee.address || "No address"}</span>
            </div>
          </div>

          {/* Assigned Positions / Job Titles */}
          <div className="space-y-2">
            <h4 className="font-heading font-semibold text-sm flex items-center gap-1.5">
              <RiSuitcaseLine className="size-4 text-primary" />
              Assigned Positions & Attributes ({positions.length})
            </h4>

            {positions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No positions assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {positions.map((pos) => (
                  <div
                    key={pos.id}
                    className="rounded-md border border-border/40 bg-muted/10 text-xs overflow-hidden"
                  >
                    <div className="flex items-center justify-between p-2 gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {pos.jobTitle?.name || pos.jobTitle?.code || "Unknown Title"}
                        </span>
                        {pos.jobTitle?.code && (
                          <span className="text-[10px] text-muted-foreground">
                            ({pos.jobTitle.code})
                          </span>
                        )}
                        {pos.department && (
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {pos.department.name}
                          </Badge>
                        )}
                        {pos.isPrimary && (
                          <Badge className="font-mono text-[10px] bg-primary/15 text-primary border-primary/30" variant="outline">
                            Primary
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!pos.isPrimary && (
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            title="Set as Primary Position"
                            onClick={() => handleSetPrimaryPosition(pos.id)}
                          >
                            <RiStarLine className="size-3.5" />
                          </Button>
                        )}
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          title="Position Attributes"
                          onClick={() => togglePositionAttributes(pos.id)}
                          className={expandedPosId === pos.id ? "text-primary" : ""}
                        >
                          <RiSettings3Line className="size-3.5" />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => handleRemovePosition(pos.id)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <RiDeleteBinLine className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    {expandedPosId === pos.id && (
                      <div className="border-t border-border/40 bg-background/50 p-2.5 space-y-2">
                        <div className="text-[11px] text-muted-foreground">
                          Position Attributes (e.g. license_number, consultation_fee, languages):
                        </div>
                        {Object.keys(posAttrs).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(posAttrs).map(([k, v]) => (
                              <Badge key={k} variant="secondary" className="font-mono text-[11px] gap-1">
                                <span className="text-muted-foreground">{k}:</span>
                                <span>{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePositionAttribute(k)}
                                  className="text-muted-foreground hover:text-destructive ml-1"
                                >
                                  &times;
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        <form onSubmit={handleSetPositionAttribute} className="flex gap-2">
                          <Input
                            placeholder="Key (e.g. license_number)"
                            value={attrKey}
                            onChange={(e) => setAttrKey(e.target.value)}
                            className="h-7 text-xs font-mono flex-1"
                            required
                          />
                          <Input
                            placeholder='Value (e.g. DEN-12345 or ["EN","KH"])'
                            value={attrValue}
                            onChange={(e) => setAttrValue(e.target.value)}
                            className="h-7 text-xs font-mono flex-1"
                            required
                          />
                          <Button type="submit" size="sm" disabled={attrLoading} className="h-7 font-mono text-xs">
                            {attrLoading ? <RiLoader4Line className="size-3 animate-spin" /> : <RiAddLine className="size-3.5" />}
                          </Button>
                        </form>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAssignPosition} className="flex gap-2 pt-1">
              <select
                value={selectedJobTitle}
                onChange={(e) => setSelectedJobTitle(e.target.value)}
                className="h-8 rounded-md border border-input bg-background/90 dark:bg-black/25 px-2 text-xs font-mono text-foreground focus-visible:border-primary outline-none flex-1"
                required
              >
                <option value="">Select Job Title...</option>
                {jobTitles.map((jt) => (
                  <option key={jt.code} value={jt.code}>
                    {jt.name} ({jt.code})
                  </option>
                ))}
              </select>

              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="h-8 rounded-md border border-input bg-background/90 dark:bg-black/25 px-2 text-xs font-mono text-foreground focus-visible:border-primary outline-none flex-1"
              >
                <option value="">Department (Optional)...</option>
                {departments.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </select>

              <Button type="submit" size="sm" disabled={posLoading || !selectedJobTitle} className="h-8 font-mono text-xs">
                {posLoading ? <RiLoader4Line className="size-3 animate-spin" /> : <RiAddLine className="size-3.5" />}
              </Button>
            </form>
          </div>

          {/* Shift Work Schedules */}
          <div className="space-y-2">
            <h4 className="font-heading font-semibold text-sm flex items-center gap-1.5">
              <RiTimeLine className="size-4 text-primary" />
              Work Schedules ({schedules.length})
            </h4>

            {schedules.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No shift work schedules assigned.</p>
            ) : (
              <div className="space-y-1.5">
                {schedules.map((s) => (
                  <div
                    key={s.id}
                    className="p-2 rounded-md border border-border/40 bg-muted/10 text-xs"
                  >
                    {editingSchedId === s.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={editDay}
                          onChange={(e) => setEditDay(Number(e.target.value))}
                          className="h-7 rounded-md border border-input bg-background px-2 text-xs font-mono"
                        >
                          {DAYS.map((name, i) => (
                            <option key={name} value={i}>
                              {name}
                            </option>
                          ))}
                        </select>
                        <Input
                          type="time"
                          value={editStart}
                          onChange={(e) => setEditStart(e.target.value)}
                          className="h-7 text-xs font-mono w-24"
                        />
                        <Input
                          type="time"
                          value={editEnd}
                          onChange={(e) => setEditEnd(e.target.value)}
                          className="h-7 text-xs font-mono w-24"
                        />
                        <label className="flex items-center gap-1 text-[11px]">
                          <input
                            type="checkbox"
                            checked={editActive}
                            onChange={(e) => setEditActive(e.target.checked)}
                          />
                          Active
                        </label>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => handleSaveSchedule(s.id)}
                          className="text-emerald-600"
                        >
                          <RiCheckLine className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => setEditingSchedId(null)}
                        >
                          <RiCloseLine className="size-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {DAYS[s.dayOfWeek] || `Day ${s.dayOfWeek}`}
                          </span>
                          <span className="text-muted-foreground">
                            {s.startTime.slice(0, 5)} &ndash; {s.endTime.slice(0, 5)}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              s.isActive
                                ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                                : "text-muted-foreground"
                            }`}
                          >
                            {s.isActive ? "Active" : "Paused"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => startEditSchedule(s)}
                          >
                            <RiEditLine className="size-3.5" />
                          </Button>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => handleDeleteSchedule(s.id)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <RiDeleteBinLine className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddSchedule} className="flex gap-2 pt-1 items-center">
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="h-8 rounded-md border border-input bg-background/90 dark:bg-black/25 px-2 text-xs font-mono text-foreground focus-visible:border-primary outline-none w-32"
              >
                {DAYS.map((name, i) => (
                  <option key={name} value={i}>
                    {name}
                  </option>
                ))}
              </select>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-8 text-xs font-mono w-28"
                required
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-8 text-xs font-mono w-28"
                required
              />
              <Button type="submit" size="sm" disabled={schedLoading} className="h-8 font-mono text-xs">
                {schedLoading ? <RiLoader4Line className="size-3 animate-spin" /> : <RiAddLine className="size-3.5" />}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
