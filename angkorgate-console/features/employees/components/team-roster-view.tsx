"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  RiCalendar2Line,
  RiLoader4Line,
  RiLoginCircleLine,
  RiLogoutCircleLine,
  RiTimeLine,
} from "@remixicon/react"
import type {
  AttendanceLog,
  Department,
  Employee,
  RosterDayCell,
  TeamRosterData,
} from "../types/employees.types"
import {
  clockInEmployeeAction,
  clockOutEmployeeAction,
  getAttendanceLogsAction,
  getTeamRosterAction,
} from "../server/employees-actions"

interface TeamRosterViewProps {
  initialRoster: TeamRosterData
  initialAttendance: AttendanceLog[]
  departments: Department[]
  employees: Employee[]
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function cellBadge(cell: RosterDayCell) {
  switch (cell.status) {
    case "SHIFT":
      return (
        <div className="rounded bg-primary/15 border border-primary/30 px-1.5 py-1 text-[10px] text-primary">
          {cell.shifts.map((s, idx) => (
            <div key={idx}>
              {s.startTime}–{s.endTime}
            </div>
          ))}
        </div>
      )
    case "OVERRIDE_SHIFT":
      return (
        <div className="rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-1 text-[10px] text-emerald-500">
          {cell.shifts.map((s, idx) => (
            <div key={idx}>
              {s.startTime}–{s.endTime}
            </div>
          ))}
          <div className="text-[9px] opacity-80">Override</div>
        </div>
      )
    case "OVERRIDE_OFF":
      return (
        <div className="rounded bg-rose-500/10 border border-rose-500/30 px-1.5 py-1 text-[10px] text-rose-500">
          OFF ({cell.note || "Override"})
        </div>
      )
    case "ON_LEAVE":
      return (
        <div className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-1 text-[10px] text-amber-500">
          {cell.leaveType || "LEAVE"}
        </div>
      )
    default:
      return <span className="text-[10px] text-muted-foreground/50">—</span>
  }
}

export function TeamRosterView({
  initialRoster,
  initialAttendance,
  departments,
  employees,
}: TeamRosterViewProps) {
  const router = useRouter()
  const [roster, setRoster] = useState<TeamRosterData>(initialRoster)
  const [attendance, setAttendance] = useState<AttendanceLog[]>(initialAttendance)

  const [startDate, setStartDate] = useState(
    initialRoster.startDate || new Date().toISOString().slice(0, 10)
  )
  const [spanDays, setSpanDays] = useState<7 | 14 | 30>(7)
  const [deptCode, setDeptCode] = useState("")
  const [loading, setLoading] = useState(false)

  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || "")
  const [clockNote, setClockNote] = useState("")
  const [clockBusy, setClockBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  )

  const loadRoster = async (nextStart = startDate, nextSpan = spanDays, nextDept = deptCode) => {
    setLoading(true)
    const end = addDays(nextStart, nextSpan - 1)
    const [nextRoster, nextLogs] = await Promise.all([
      getTeamRosterAction({
        startDate: nextStart,
        endDate: end,
        departmentCode: nextDept || undefined,
      }),
      getAttendanceLogsAction(),
    ])
    setRoster(nextRoster)
    setAttendance(nextLogs)
    setLoading(false)
  }

  const handleClock = async (mode: "in" | "out") => {
    if (!selectedEmpId) return
    setClockBusy(true)
    setFeedback(null)
    const res =
      mode === "in"
        ? await clockInEmployeeAction(selectedEmpId, clockNote.trim() || undefined)
        : await clockOutEmployeeAction(selectedEmpId, clockNote.trim() || undefined)
    setClockBusy(false)
    if (res.success) {
      setClockNote("")
      setFeedback({
        type: "success",
        message: mode === "in" ? "Employee clocked in." : "Employee clocked out.",
      })
      await loadRoster()
      router.refresh()
    } else {
      setFeedback({ type: "error", message: res.message || "Attendance action failed" })
    }
  }

  return (
    <div className="space-y-6 min-w-0 w-full">
      {/* Calendar Controls */}
      <Card className="border border-border/50 bg-card min-w-0 overflow-hidden">
        <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <RiCalendar2Line className="size-4 text-primary shrink-0" />
              Team Shift Roster Calendar
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              Unified view of weekly shifts, schedule overrides, approved leave, and clock-in logs.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs shrink-0">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 w-36 text-xs"
            />
            <select
              value={spanDays}
              onChange={(e) => {
                const next = Number(e.target.value) as 7 | 14 | 30
                setSpanDays(next)
                void loadRoster(startDate, next, deptCode)
              }}
              className="h-8 rounded-md border border-input bg-background/90 dark:bg-black/25 px-2 text-xs font-mono outline-none"
            >
              <option value={7}>Weekly (7d)</option>
              <option value={14}>Bi-Weekly (14d)</option>
              <option value={30}>Monthly (30d)</option>
            </select>
            <select
              value={deptCode}
              onChange={(e) => {
                setDeptCode(e.target.value)
                void loadRoster(startDate, spanDays, e.target.value)
              }}
              className="h-8 rounded-md border border-input bg-background/90 dark:bg-black/25 px-2 text-xs font-mono outline-none"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => void loadRoster()}
              className="h-8 font-mono text-xs"
            >
              {loading ? <RiLoader4Line className="size-3.5 animate-spin" /> : "Refresh"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="min-w-0">
          {roster.employees.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-8 text-center font-mono text-xs text-muted-foreground">
              No active employees match the selected filters.
            </div>
          ) : (
            <div className="w-full rounded-md border border-border/50 overflow-hidden">
              <Table className="w-max min-w-full">
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-mono text-xs sticky left-0 bg-card z-10 min-w-[170px]">
                      Employee
                    </TableHead>
                    {roster.dates.map((d) => (
                      <TableHead key={d} className="font-mono text-[11px] min-w-[105px] text-center">
                        <div>{d.slice(5)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, {
                            weekday: "short",
                            timeZone: "UTC",
                          })}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.employees.map((emp) => (
                    <TableRow key={emp.id} className="font-mono text-xs">
                      <TableCell className="sticky left-0 bg-card z-10 border-r border-border/40">
                        <div className="font-sans text-sm font-medium">{emp.fullName}</div>
                        <div className="text-[10px] text-primary font-semibold">
                          {emp.employeeCode}
                          {emp.departmentName ? ` · ${emp.departmentName}` : ""}
                        </div>
                      </TableCell>
                      {emp.days.map((day) => (
                        <TableCell key={day.date} className="text-center align-top p-1.5">
                          <div className="space-y-1">
                            {cellBadge(day)}
                            {day.attendance && day.attendance.length > 0 && (
                              <div className="text-[9px] text-emerald-500">
                                ● {day.attendance.length} log{day.attendance.length > 1 ? "s" : ""}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Clock-In / Clock-Out */}
      <Card className="border border-border/50 bg-card min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <RiTimeLine className="size-4 text-primary" />
            Attendance Clock-In / Clock-Out
          </CardTitle>
          <CardDescription className="font-mono text-xs">
            Record shift check-ins and check-outs for Clinic or POS staff.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 min-w-0">
          {feedback && (
            <div
              className={`font-mono text-xs p-2.5 rounded-md border ${
                feedback.type === "success"
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              }`}
            >
              {feedback.message}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="h-8 rounded-md border border-input bg-background/90 dark:bg-black/25 px-2.5 text-xs font-mono outline-none min-w-[220px]"
            >
              <option value="">Select employee...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.employeeCode} · {e.fullName}
                </option>
              ))}
            </select>
            <Input
              placeholder="Optional shift note (e.g. Front desk)"
              value={clockNote}
              onChange={(e) => setClockNote(e.target.value)}
              className="h-8 max-w-xs text-xs"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={clockBusy || !selectedEmpId}
              onClick={() => void handleClock("in")}
              className="h-8 font-mono text-xs text-emerald-600 border-emerald-500/40"
            >
              <RiLoginCircleLine className="mr-1 size-3.5" /> Clock In
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={clockBusy || !selectedEmpId}
              onClick={() => void handleClock("out")}
              className="h-8 font-mono text-xs text-amber-600 border-amber-500/40"
            >
              <RiLogoutCircleLine className="mr-1 size-3.5" /> Clock Out
            </Button>
          </div>

          {attendance.length > 0 && (
            <div className="w-full max-w-full overflow-x-auto rounded-md border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-mono text-xs">Employee</TableHead>
                    <TableHead className="font-mono text-xs">Clock In</TableHead>
                    <TableHead className="font-mono text-xs">Clock Out</TableHead>
                    <TableHead className="font-mono text-xs">Source</TableHead>
                    <TableHead className="font-mono text-xs">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.slice(0, 20).map((log) => (
                    <TableRow key={log.id} className="font-mono text-xs">
                      <TableCell>
                        <div className="font-sans text-sm font-medium">
                          {log.employee?.fullName || log.employeeId.slice(0, 8)}
                        </div>
                        {log.employee?.employeeCode && (
                          <div className="text-[10px] text-primary">{log.employee.employeeCode}</div>
                        )}
                      </TableCell>
                      <TableCell>{new Date(log.clockInAt).toLocaleString()}</TableCell>
                      <TableCell>
                        {log.clockOutAt ? (
                          new Date(log.clockOutAt).toLocaleString()
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/40">
                            ON SHIFT
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {log.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{log.notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
