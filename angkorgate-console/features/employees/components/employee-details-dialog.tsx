"use client"

import { useState, useEffect } from "react"
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
import { Label } from "@/components/ui/label"
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
} from "@remixicon/react"
import {
  updateEmployeeStatusAction,
  getEmployeePositions,
  assignPositionAction,
  removePositionAction,
  getEmployeeSchedules,
  createScheduleAction,
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

export function EmployeeDetailsDialog({
  employee,
  departments,
  jobTitles,
  open,
  onOpenChange,
}: EmployeeDetailsDialogProps) {
  const [status, setStatus] = useState<EmploymentStatus>(employee.status || "ACTIVE")
  const [statusLoading, setStatusLoading] = useState(false)

  // Positions
  const [positions, setPositions] = useState<EmployeePosition[]>([])
  const [selectedJobTitle, setSelectedJobTitle] = useState("")
  const [selectedDept, setSelectedDept] = useState("")
  const [posLoading, setPosLoading] = useState(false)

  // Schedules
  const [schedules, setSchedules] = useState<EmployeeSchedule[]>([])
  const [dayOfWeek, setDayOfWeek] = useState(1) // Monday
  const [startTime, setStartTime] = useState("08:00")
  const [endTime, setEndTime] = useState("17:00")
  const [schedLoading, setSchedLoading] = useState(false)

  useEffect(() => {
    if (open) {
      getEmployeePositions(employee.id).then(setPositions)
      getEmployeeSchedules(employee.id).then(setSchedules)
      setStatus(employee.status || "ACTIVE")
      if (jobTitles.length > 0 && !selectedJobTitle) {
        setSelectedJobTitle(jobTitles[0].code)
      }
      if (departments.length > 0 && !selectedDept) {
        setSelectedDept(departments[0].code)
      }
    }
  }, [open, employee.id, employee.status, jobTitles, departments, selectedJobTitle, selectedDept])

  const handleStatusChange = async (newStatus: EmploymentStatus) => {
    setStatusLoading(true)
    const res = await updateEmployeeStatusAction(employee.id, newStatus)
    setStatusLoading(false)
    if (res.success) {
      setStatus(newStatus)
    }
  }

  const handleAssignPosition = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJobTitle) return
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
    }
  }

  const handleRemovePosition = async (positionId: string) => {
    const res = await removePositionAction(employee.id, positionId)
    if (res.success) {
      setPositions((prev) => prev.filter((p) => p.id !== positionId))
    }
  }

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    setSchedLoading(true)
    const res = await createScheduleAction(employee.id, {
      dayOfWeek,
      startTime,
      endTime,
      isRecurring: true,
    })
    setSchedLoading(false)
    if (res.success) {
      const refreshed = await getEmployeeSchedules(employee.id)
      setSchedules(refreshed)
    }
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    const res = await deleteScheduleAction(employee.id, scheduleId)
    if (res.success) {
      setSchedules((prev) => prev.filter((s) => s.id !== scheduleId))
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
            Employee UUID: {employee.id} &bull; Linked User ID: {employee.userId || "None"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3 font-mono text-xs">
          {/* Status Bar */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
            <span className="text-muted-foreground">Employment Status:</span>
            <div className="flex items-center gap-2">
              <select
                value={status}
                disabled={statusLoading}
                onChange={(e) => handleStatusChange(e.target.value as EmploymentStatus)}
                className="h-7 rounded-md border border-input bg-background/90 dark:bg-black/25 px-2 text-xs font-mono text-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 outline-none"
              >
                <option value="PROBATION">PROBATION</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="TERMINATED">TERMINATED</option>
              </select>
              {statusLoading && <RiLoader4Line className="size-4 animate-spin text-primary" />}
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
              Assigned Positions & Roles ({positions.length})
            </h4>

            {positions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No positions assigned yet.</p>
            ) : (
              <div className="space-y-1.5">
                {positions.map((pos) => (
                  <div
                    key={pos.id}
                    className="flex items-center justify-between p-2 rounded-md border border-border/40 bg-muted/10 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{pos.jobTitleCode}</span>
                      {pos.departmentCode && (
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {pos.departmentCode}
                        </Badge>
                      )}
                      {pos.isPrimary && (
                        <span className="text-[10px] text-primary font-medium uppercase">[Primary]</span>
                      )}
                    </div>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => handleRemovePosition(pos.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <RiDeleteBinLine className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAssignPosition} className="flex gap-2 pt-1">
              <select
                value={selectedJobTitle}
                onChange={(e) => setSelectedJobTitle(e.target.value)}
                className="h-8 rounded-md border border-input bg-background/90 dark:bg-black/25 px-2 text-xs font-mono text-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 outline-none flex-1"
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
                className="h-8 rounded-md border border-input bg-background/90 dark:bg-black/25 px-2 text-xs font-mono text-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 outline-none flex-1"
              >
                <option value="">Department (Optional)...</option>
                {departments.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </select>

              <Button type="submit" size="sm" disabled={posLoading || !selectedJobTitle} className="h-7 font-mono text-xs">
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
                    className="flex items-center justify-between p-2 rounded-md border border-border/40 bg-muted/10 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-foreground">{DAYS[s.dayOfWeek] || `Day ${s.dayOfWeek}`}</span>
                      <span className="text-muted-foreground ml-2">
                        {s.startTime} &ndash; {s.endTime}
                      </span>
                      {s.isRecurring && (
                        <span className="text-[10px] text-muted-foreground ml-2">(Weekly recurring)</span>
                      )}
                    </div>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => handleDeleteSchedule(s.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <RiDeleteBinLine className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddSchedule} className="flex gap-2 pt-1 items-center">
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="h-8 rounded-md border border-input bg-background/90 dark:bg-black/25 px-2 text-xs font-mono text-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/40 outline-none w-32"
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
                className="h-7 text-xs font-mono w-24"
                required
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-7 text-xs font-mono w-24"
                required
              />
              <Button type="submit" size="sm" disabled={schedLoading} className="h-7 font-mono text-xs">
                {schedLoading ? <RiLoader4Line className="size-3 animate-spin" /> : <RiAddLine className="size-3.5" />}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
