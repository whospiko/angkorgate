"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  RiBriefcase4Line,
  RiCalendarCheckLine,
  RiCalendarEventLine,
  RiCheckLine,
  RiCloseLine,
  RiLoader4Line,
  RiTimeLine,
} from "@remixicon/react"
import { LeaveAttachmentPreview, type LeaveType } from "@/features/employees"
import type { MyWorkspaceData } from "../types/account.types"
import {
  cancelMyLeaveRequestAction,
  getMyWorkspaceAction,
  reviewMyTeamLeaveAction,
  submitMyLeaveRequestAction,
} from "../server/account-actions"

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

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

export function AccountWorkspaceTab({ initialData }: { initialData: MyWorkspaceData }) {
  const router = useRouter()
  const [workspace, setWorkspace] = useState<MyWorkspaceData>(initialData)

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

  const [submitting, setSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
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
      setFeedback({ type: "success", message: res.message || `Leave request ${decision.toLowerCase()}.` })
      await refreshWorkspace()
    } else {
      setFeedback({ type: "error", message: res.message || "Failed to review leave request." })
    }
  }

  return (
    <div className="space-y-6">
      {/* Employee Summary */}
      <Card className="border border-border bg-card">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <RiBriefcase4Line className="size-5 text-primary" />
              {emp.fullName}
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              {emp.employeeCode}
              {primaryPos?.jobTitle?.name ? ` · ${primaryPos.jobTitle.name}` : ""}
              {primaryPos?.department?.name ? ` · ${primaryPos.department.name}` : ""}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <Badge variant="outline">{emp.employmentStatus}</Badge>
            {emp.employmentType && <Badge variant="secondary">{emp.employmentType}</Badge>}
          </div>
        </CardHeader>
      </Card>

      {/* My Leave Balances */}
      {workspace.balances && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {workspace.balances.items.map((bal) => (
            <Card key={bal.leaveType} className="border border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>{bal.leaveType} Leave ({workspace.balances?.year})</span>
                  <RiCalendarCheckLine className="size-4 text-primary" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="font-heading text-2xl font-bold">
                  {bal.remainingDays}{" "}
                  <span className="font-mono text-xs font-normal text-muted-foreground">
                    / {bal.allowanceDays} days left
                  </span>
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  Used: {bal.usedDays}d · Pending: {bal.pendingDays}d
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* My Weekly Shifts & Upcoming Exceptions */}
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
                        ? "border-emerald-500/40 text-emerald-500"
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
                        ? "border-emerald-500/40 text-emerald-500"
                        : "border-rose-500/40 text-rose-500"
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

      {/* Submit Leave Request */}
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="font-heading text-base">Submit Leave Request</CardTitle>
          <CardDescription className="font-mono text-xs">
            Request time off and optionally attach supporting PDF, PNG, or JPG documentation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <form onSubmit={handleSubmitLeave} className="grid grid-cols-1 sm:grid-cols-12 gap-3 font-mono text-xs">
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
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto font-mono text-xs">
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

      {/* Team Leave Approvals Routed to Manager */}
      {workspace.teamApprovals.length > 0 && (
        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="font-heading text-base">
              Team Leave Approvals ({workspace.teamApprovals.filter((a) => a.status === "PENDING").length} pending)
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
                      className="h-7 px-2 font-mono text-[11px] text-emerald-600 border-emerald-500/40"
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

      {/* My Leave History */}
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
                          ? "border-emerald-500/40 text-emerald-500"
                          : lv.status === "PENDING"
                          ? "border-amber-500/40 text-amber-500"
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
  )
}
