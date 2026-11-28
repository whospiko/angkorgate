"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  RiCalendarCheckLine,
  RiCalendarEventLine,
  RiCheckLine,
  RiCloseLine,
  RiFlightTakeoffLine,
  RiLayoutGridLine,
  RiLoader4Line,
  RiLoginCircleLine,
  RiLogoutCircleLine,
  RiTeamLine,
  RiTimeLine,
} from "@remixicon/react"
import { LeaveAttachmentPreview, type LeaveType } from "@/features/employees"
import type { MyWorkspaceData } from "../types/account.types"
import {
  cancelMyLeaveRequestAction,
  clockInMeAction,
  clockOutMeAction,
  getMyWorkspaceAction,
  reviewMyTeamLeaveAction,
  submitMyLeaveRequestAction,
} from "../server/account-actions"

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

type WorkspaceSection = "overview" | "attendance" | "leave" | "approvals"

function formatDateTime(value?: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatTimeOnly(value?: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}

export function AccountWorkspaceTab({ initialData }: { initialData: MyWorkspaceData }) {
  const router = useRouter()
  const [workspace, setWorkspace] = useState<MyWorkspaceData>(initialData)
  const [activeSection, setActiveSection] = useState<WorkspaceSection>("overview")

  // Leave request form state
  const [leaveType, setLeaveType] = useState<LeaveType>("ANNUAL")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reason, setReason] = useState("")
  const [attachment, setAttachment] = useState<{
    name: string
    mimeType: "application/pdf" | "image/png" | "image/jpeg"
    dataUrl: string
  } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Attendance & action state
  const [clockNote, setClockNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [clockBusy, setClockBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  )

  const emp = workspace.employee
  if (!emp) {
    return (
      <Card className="border border-border bg-card">
        <CardContent className="py-10 text-center font-mono text-xs text-muted-foreground">
          Your account is not linked to an employee profile yet. Contact HR to link your account.
        </CardContent>
      </Card>
    )
  }

  const primaryPos = emp.positions?.find((p) => p.isPrimary) ?? emp.positions?.[0]
  const openShift = workspace.attendance?.find((a) => !a.clockOutAt)
  const pendingApprovalsCount = workspace.teamApprovals.filter((a) => a.status === "PENDING").length
  const empInitials = emp.fullName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setAttachment(null)
      return
    }
    const allowed: ("application/pdf" | "image/png" | "image/jpeg")[] = [
      "application/pdf",
      "image/png",
      "image/jpeg",
    ]
    if (!allowed.includes(file.type as "application/pdf" | "image/png" | "image/jpeg")) {
      setFeedback({ type: "error", message: "Only PDF, PNG, or JPG files are allowed." })
      e.target.value = ""
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setFeedback({ type: "error", message: "Attachment must be smaller than 2 MB." })
      e.target.value = ""
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFeedback(null)
        setAttachment({
          name: file.name,
          mimeType: file.type as "application/pdf" | "image/png" | "image/jpeg",
          dataUrl: reader.result,
        })
      }
    }
    reader.readAsDataURL(file)
  }

  const refreshWorkspace = async () => {
    const fresh = await getMyWorkspaceAction()
    setWorkspace(fresh)
    router.refresh()
  }

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!startDate || !endDate) return
    setFeedback(null)
    setSubmitting(true)
    const res = await submitMyLeaveRequestAction({
      leaveType,
      startDate,
      endDate,
      reason: reason.trim() || undefined,
      attachmentName: attachment?.name,
      attachmentMimeType: attachment?.mimeType,
      attachmentDataUrl: attachment?.dataUrl,
    })
    setSubmitting(false)
    if (res.success) {
      setFeedback({ type: "success", message: res.message || "Leave request submitted." })
      setStartDate("")
      setEndDate("")
      setReason("")
      setAttachment(null)
      if (fileRef.current) fileRef.current.value = ""
      await refreshWorkspace()
    } else {
      setFeedback({ type: "error", message: res.message || "Failed to submit leave request." })
    }
  }

  const handleCancelLeave = async (id: string) => {
    setCancellingId(id)
    setFeedback(null)
    const res = await cancelMyLeaveRequestAction(id)
    setCancellingId(null)
    if (res.success) {
      setFeedback({ type: "success", message: res.message || "Leave request cancelled." })
      await refreshWorkspace()
    } else {
      setFeedback({ type: "error", message: res.message || "Failed to cancel leave request." })
    }
  }

  const handleReviewTeamLeave = async (id: string, decision: "APPROVED" | "REJECTED") => {
    setReviewingId(id)
    setFeedback(null)
    const res = await reviewMyTeamLeaveAction(id, decision)
    setReviewingId(null)
    if (res.success) {
      setFeedback({
        type: "success",
        message: res.message || `Leave request ${decision.toLowerCase()}.`,
      })
      await refreshWorkspace()
    } else {
      setFeedback({ type: "error", message: res.message || "Failed to review leave request." })
    }
  }

  const getCurrentCoords = (): Promise<{
    coords?: { latitude: number; longitude: number }
    geoError?: string
  }> =>
    new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve({ geoError: "Browser geolocation is not supported or requires HTTPS/localhost." })
        return
      }
      const readPos = (highAccuracy: boolean) => {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({
              coords: {
                latitude: Number(pos.coords.latitude.toFixed(6)),
                longitude: Number(pos.coords.longitude.toFixed(6)),
              },
            }),
          (err) => {
            if (highAccuracy && err.code !== 1) {
              // Retry without high-accuracy (Wi-Fi/OS location) when laptop GPS times out
              readPos(false)
              return
            }
            const reason =
              err.code === 1
                ? "Browser Location permission was denied. Please allow Location access for this site."
                : err.code === 3
                ? "Location lookup timed out. Check macOS/browser Location Services."
                : "Unable to read your device location."
            resolve({ geoError: reason })
          },
          { enableHighAccuracy: highAccuracy, timeout: 6000, maximumAge: 60_000 }
        )
      }
      readPos(true)
    })

  const handleSelfClock = async (mode: "in" | "out", notes?: string) => {
    setClockBusy(true)
    setFeedback(null)
    const geo = mode === "in" ? await getCurrentCoords() : {}
    const res =
      mode === "in"
        ? await clockInMeAction(notes?.trim() || undefined, geo.coords)
        : await clockOutMeAction(notes?.trim() || undefined)
    setClockBusy(false)
    if (res.success) {
      setClockNote("")
      setFeedback({
        type: "success",
        message: res.message || (mode === "in" ? "Clocked in successfully." : "Clocked out successfully."),
      })
      await refreshWorkspace()
    } else {
      const msg =
        !geo.coords && geo.geoError && res.message?.includes("Location (GPS)")
          ? `${res.message} (${geo.geoError})`
          : res.message || "Attendance action failed."
      setFeedback({ type: "error", message: msg })
    }
  }

  const navItems: {
    id: WorkspaceSection
    label: string
    icon: React.ReactNode
    badge?: number
  }[] = [
    {
      id: "overview",
      label: "Overview & Shifts",
      icon: <RiLayoutGridLine className="size-4" />,
    },
    {
      id: "attendance",
      label: "Attendance",
      icon: <RiTimeLine className="size-4" />,
      badge: workspace.attendance?.length || 0,
    },
    {
      id: "leave",
      label: "Leave & Time Off",
      icon: <RiFlightTakeoffLine className="size-4" />,
      badge: workspace.leaveRequests.length,
    },
    ...(workspace.teamApprovals.length > 0
      ? [
          {
            id: "approvals" as const,
            label: "Team Approvals",
            icon: <RiTeamLine className="size-4" />,
            badge: pendingApprovalsCount,
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-5">
      {/* Staff Identity & Quick Clock Hero */}
      <Card className="border border-border bg-card overflow-hidden">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 border border-primary/30 font-heading text-sm font-bold text-primary">
              {empInitials}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-base sm:text-lg font-semibold leading-none">
                  {emp.fullName}
                </h2>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {emp.employmentStatus}
                </Badge>
                {emp.employmentType && (
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {emp.employmentType}
                  </Badge>
                )}
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                {emp.employeeCode}
                {primaryPos?.jobTitle?.name ? ` · ${primaryPos.jobTitle.name}` : ""}
                {primaryPos?.department?.name ? ` · ${primaryPos.department.name}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {openShift ? (
              <>
                <span className="font-mono text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 rounded-md px-2.5 py-1">
                  Active since {formatTimeOnly(openShift.clockInAt)}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={clockBusy}
                  onClick={() => void handleSelfClock("out")}
                  className="font-mono text-xs text-amber-400 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20"
                >
                  <RiLogoutCircleLine className="mr-1.5 size-4" />
                  Clock Out
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={clockBusy}
                onClick={() => void handleSelfClock("in")}
                className="font-mono text-xs text-emerald-400 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20"
              >
                <RiLoginCircleLine className="mr-1.5 size-4" />
                Clock In
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dedicated Workspace Alert Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 font-mono text-xs ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-destructive/10 text-destructive border-destructive/30"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="opacity-70 hover:opacity-100"
            aria-label="Dismiss message"
          >
            <RiCloseLine className="size-4" />
          </button>
        </div>
      )}

      {/* Sub-Navigation Pills */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-muted/40 p-1.5">
        {navItems.map((item) => {
          const active = activeSection === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                active
                  ? "bg-card text-foreground shadow-sm border border-border/80"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {typeof item.badge === "number" && item.badge > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] leading-none ${
                    active
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* SECTION 1: OVERVIEW & SHIFTS */}
      {activeSection === "overview" && (
        <div className="space-y-5">
          {workspace.balances && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {workspace.balances.items.map((bal) => {
                const usedPct =
                  bal.allowanceDays > 0
                    ? Math.min(100, Math.round((bal.usedDays / bal.allowanceDays) * 100))
                    : 0
                return (
                  <Card key={bal.leaveType} className="border border-border bg-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span>
                          {bal.leaveType} Leave ({workspace.balances?.year})
                        </span>
                        <RiCalendarCheckLine className="size-4 text-primary" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2.5">
                      <div className="font-heading text-2xl font-bold">
                        {bal.remainingDays}{" "}
                        <span className="font-mono text-xs font-normal text-muted-foreground">
                          / {bal.allowanceDays} days left
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${usedPct}%` }}
                        />
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        Used: {bal.usedDays}d · Pending: {bal.pendingDays}d
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="font-heading text-base flex items-center gap-2">
                  <RiTimeLine className="size-4 text-primary" />
                  My Weekly Shifts ({workspace.schedules.length})
                </CardTitle>
                <CardDescription className="font-mono text-xs">
                  Your recurring weekly work schedule.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {workspace.schedules.length === 0 ? (
                  <p className="font-mono text-xs text-muted-foreground">
                    No regular shifts configured yet.
                  </p>
                ) : (
                  workspace.schedules.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-md border border-border/50 bg-muted/20 px-3 py-2 font-mono text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {DAY_NAMES[s.dayOfWeek] ?? `Day ${s.dayOfWeek}`}
                        </Badge>
                        <span>
                          {s.startTime.slice(0, 5)} &ndash; {s.endTime.slice(0, 5)}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          s.isActive
                            ? "border-emerald-500/40 text-emerald-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {s.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border border-border bg-card">
              <CardHeader>
                <CardTitle className="font-heading text-base flex items-center gap-2">
                  <RiCalendarEventLine className="size-4 text-primary" />
                  Schedule Exceptions ({workspace.overrides.length})
                </CardTitle>
                <CardDescription className="font-mono text-xs">
                  Date-specific off days or custom shift hours.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {workspace.overrides.length === 0 ? (
                  <p className="font-mono text-xs text-muted-foreground">
                    No schedule overrides scheduled.
                  </p>
                ) : (
                  workspace.overrides.map((ov) => (
                    <div
                      key={ov.id}
                      className="flex items-center justify-between rounded-md border border-border/50 bg-muted/20 px-3 py-2 font-mono text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold">{ov.date}</div>
                        {ov.reason && (
                          <div className="text-[11px] text-muted-foreground">{ov.reason}</div>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          ov.isAvailable
                            ? "border-emerald-500/40 text-emerald-400"
                            : "border-rose-500/40 text-rose-400"
                        }`}
                      >
                        {ov.isAvailable
                          ? `${ov.startTime?.slice(0, 5) || ""}–${ov.endTime?.slice(0, 5) || ""}`
                          : "DAY OFF"}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* SECTION 2: ATTENDANCE */}
      {activeSection === "attendance" && (
        <div className="space-y-4">
          <Card className="border border-border bg-card">
            <CardHeader>
              <CardTitle className="font-heading text-base">Shift Check-In / Check-Out</CardTitle>
              <CardDescription className="font-mono text-xs">
                Add an optional shift note when starting or ending a session.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2.5">
              <Input
                value={clockNote}
                onChange={(e) => setClockNote(e.target.value)}
                placeholder="Optional shift note (e.g. Morning clinic / Front desk)"
                className="max-w-sm font-mono text-xs"
              />
              {openShift ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={clockBusy}
                  onClick={() => void handleSelfClock("out", clockNote)}
                  className="font-mono text-xs text-amber-400 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20"
                >
                  <RiLogoutCircleLine className="mr-1.5 size-4" />
                  Clock Out
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={clockBusy}
                  onClick={() => void handleSelfClock("in", clockNote)}
                  className="font-mono text-xs text-emerald-400 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20"
                >
                  <RiLoginCircleLine className="mr-1.5 size-4" />
                  Clock In
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border bg-card">
            <CardHeader>
              <CardTitle className="font-heading text-base">
                My Attendance History ({workspace.attendance?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!workspace.attendance || workspace.attendance.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground py-4 text-center">
                  No attendance logs recorded yet.
                </p>
              ) : (
                <div className="w-full overflow-x-auto rounded-lg border border-border/60">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Session</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Worked</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workspace.attendance.slice(0, 20).map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-xs">
                            {typeof log.sessionIndex === "number" ? `#${log.sessionIndex + 1}` : "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {formatDateTime(log.clockInAt)}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {log.clockOutAt ? (
                              formatDateTime(log.clockOutAt)
                            ) : (
                              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                log.status === "LATE"
                                  ? "border-amber-500/40 text-amber-400"
                                  : "border-emerald-500/40 text-emerald-400"
                              }`}
                            >
                              {log.status === "LATE" ? `LATE +${log.lateMinutes ?? 0}m` : "ON TIME"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {typeof log.workedMinutes === "number"
                              ? `${Math.floor(log.workedMinutes / 60)}h ${log.workedMinutes % 60}m`
                              : "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {log.notes || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECTION 3: LEAVE & TIME OFF */}
      {activeSection === "leave" && (
        <div className="space-y-5">
          <Card className="border border-border bg-card">
            <CardHeader>
              <CardTitle className="font-heading text-base">Submit Leave Request</CardTitle>
              <CardDescription className="font-mono text-xs">
                Request time off and optionally attach supporting PDF, PNG, or JPG documentation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmitLeave}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 font-mono text-xs"
              >
                <div className="sm:col-span-3 space-y-1">
                  <Label htmlFor="my-leave-type">Leave Type</Label>
                  <select
                    id="my-leave-type"
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                    className="flex h-9 w-full rounded-md border border-input bg-background/90 dark:bg-black/25 px-2.5 text-xs font-mono text-foreground outline-none"
                  >
                    <option value="ANNUAL">ANNUAL</option>
                    <option value="SICK">SICK</option>
                    <option value="UNPAID">UNPAID</option>
                    <option value="MATERNITY">MATERNITY</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <Label htmlFor="my-leave-start">Start Date *</Label>
                  <Input
                    id="my-leave-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <Label htmlFor="my-leave-end">End Date *</Label>
                  <Input
                    id="my-leave-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <Label htmlFor="my-leave-reason">Reason</Label>
                  <Input
                    id="my-leave-reason"
                    placeholder="e.g. Family trip"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                <div className="sm:col-span-9 flex items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                    onChange={handleFileChange}
                    className="text-[11px] text-muted-foreground file:mr-2 file:rounded file:border file:border-border file:bg-muted file:px-2.5 file:py-1 file:font-mono file:text-[11px] file:text-foreground"
                  />
                  {attachment && (
                    <span className="text-[11px] text-primary truncate">
                      Attached: {attachment.name}
                    </span>
                  )}
                </div>

                <div className="sm:col-span-3 flex justify-end">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto font-mono text-xs"
                  >
                    {submitting ? (
                      <>
                        <RiLoader4Line className="mr-1.5 size-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Request"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card">
            <CardHeader>
              <CardTitle className="font-heading text-base">
                My Leave Requests ({workspace.leaveRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {workspace.leaveRequests.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground">
                  You have not submitted any leave requests yet.
                </p>
              ) : (
                workspace.leaveRequests.map((lv) => (
                  <div
                    key={lv.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/15 px-3 py-2.5 font-mono text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {lv.leaveType}
                        </Badge>
                        <span className="font-semibold">
                          {lv.startDate} &rarr; {lv.endDate}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            lv.status === "APPROVED"
                              ? "border-emerald-500/40 text-emerald-400"
                              : lv.status === "PENDING"
                              ? "border-amber-500/40 text-amber-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          {lv.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <span>Requested: {formatDateTime(lv.createdAt)}</span>
                        {lv.reason && <span>Reason: {lv.reason}</span>}
                        {lv.attachmentDataUrl && (
                          <LeaveAttachmentPreview
                            name={lv.attachmentName}
                            mimeType={lv.attachmentMimeType}
                            dataUrl={lv.attachmentDataUrl}
                          />
                        )}
                        {lv.reviewedBy && (
                          <span>
                            Reviewed by {lv.reviewedBy.fullName || lv.reviewedBy.email} ·{" "}
                            {formatDateTime(lv.reviewedAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    {lv.status === "PENDING" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={cancellingId === lv.id}
                        onClick={() => handleCancelLeave(lv.id)}
                        className="h-7 px-2 font-mono text-[11px] self-start sm:self-center"
                      >
                        <RiCloseLine className="mr-1 size-3" />
                        Cancel
                      </Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECTION 4: TEAM APPROVALS */}
      {activeSection === "approvals" && workspace.teamApprovals.length > 0 && (
        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="font-heading text-base">
              Team Leave Approvals ({pendingApprovalsCount} pending)
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              Direct-report leave requests routed to you as manager.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {workspace.teamApprovals.map((lv) => (
              <div
                key={lv.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/15 px-3 py-2.5 font-mono text-xs"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-sans text-sm font-medium">
                      {lv.employee?.fullName || lv.employeeId.slice(0, 8)}
                    </span>
                    {lv.employee?.employeeCode && (
                      <span className="text-[11px] text-primary font-semibold">
                        {lv.employee.employeeCode}
                      </span>
                    )}
                    <Badge variant="secondary" className="text-[10px]">
                      {lv.leaveType}
                    </Badge>
                    <span>
                      {lv.startDate} &rarr; {lv.endDate}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {lv.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span>Requested: {formatDateTime(lv.createdAt)}</span>
                    {lv.reason && <span>Reason: {lv.reason}</span>}
                    {lv.attachmentDataUrl && (
                      <LeaveAttachmentPreview
                        name={lv.attachmentName}
                        mimeType={lv.attachmentMimeType}
                        dataUrl={lv.attachmentDataUrl}
                      />
                    )}
                  </div>
                </div>

                {lv.status === "PENDING" && (
                  <div className="flex items-center gap-1.5 self-start sm:self-center">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={reviewingId === lv.id}
                      onClick={() => handleReviewTeamLeave(lv.id, "APPROVED")}
                      className="h-7 px-2 font-mono text-[11px] text-emerald-400 border-emerald-500/40"
                    >
                      <RiCheckLine className="mr-1 size-3" />
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={reviewingId === lv.id}
                      onClick={() => handleReviewTeamLeave(lv.id, "REJECTED")}
                      className="h-7 px-2 font-mono text-[11px] text-destructive border-destructive/40"
                    >
                      <RiCloseLine className="mr-1 size-3" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
