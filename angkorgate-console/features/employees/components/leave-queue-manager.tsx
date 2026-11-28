"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  RiCalendarCheckLine,
  RiCheckLine,
  RiCloseLine,
} from "@remixicon/react"
import { LeaveAttachmentPreview } from "./leave-attachment-preview"
import { Input } from "@/components/ui/input"
import type { LeavePolicy, LeaveRequest } from "../types/employees.types"
import {
  reviewLeaveRequestAction,
  cancelLeaveRequestAction,
  updateLeavePolicyAction,
} from "../server/employees-actions"

interface LeaveQueueManagerProps {
  leaveRequests: LeaveRequest[]
  leavePolicies?: LeavePolicy[]
}

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

export function LeaveQueueManager({
  leaveRequests,
  leavePolicies = [],
}: LeaveQueueManagerProps) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState("")
  const [routingFilter, setRoutingFilter] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [savingPolicy, setSavingPolicy] = useState<string | null>(null)
  const [quotaDrafts, setQuotaDrafts] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = { ANNUAL: 18, SICK: 10, MATERNITY: 90 }
    for (const p of leavePolicies) {
      init[p.leaveType] = p.annualQuotaDays
    }
    return init
  })
  const [error, setError] = useState<string | null>(null)

  const filtered = leaveRequests.filter((lr) => {
    if (statusFilter && lr.status !== statusFilter) return false
    if (routingFilter === "MANAGER" && !lr.assignedApproverId) return false
    if (routingFilter === "HR" && lr.assignedApproverId) return false
    return true
  })

  const handleSavePolicy = async (leaveType: "ANNUAL" | "SICK" | "MATERNITY") => {
    setSavingPolicy(leaveType)
    setError(null)
    const days = Number(quotaDrafts[leaveType] ?? 0)
    const res = await updateLeavePolicyAction(leaveType, days, true)
    setSavingPolicy(null)
    if (!res.success) {
      setError(res.message || "Failed to update leave policy")
    } else {
      router.refresh()
    }
  }

  const handleReview = async (id: string, decision: "APPROVED" | "REJECTED") => {
    setBusyId(id)
    setError(null)
    const res = await reviewLeaveRequestAction(id, decision)
    setBusyId(null)
    if (!res.success) {
      setError(res.message || "Failed to review leave request")
    } else {
      router.refresh()
    }
  }

  const handleCancel = async (id: string) => {
    setBusyId(id)
    setError(null)
    const res = await cancelLeaveRequestAction(id)
    setBusyId(null)
    if (!res.success) {
      setError(res.message || "Failed to cancel leave request")
    } else {
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-heading text-base font-semibold">Leave & Time-Off Queue</h3>
          <p className="font-mono text-xs text-muted-foreground">
            Review employee leave requests. Approved leave automatically updates date-level schedule availability.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={routingFilter}
            onChange={(e) => setRoutingFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background/90 dark:bg-black/25 px-2.5 text-xs font-mono text-foreground outline-none"
          >
            <option value="">All Routing</option>
            <option value="MANAGER">Routed to Manager</option>
            <option value="HR">HR / Admin Queue</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background/90 dark:bg-black/25 px-2.5 text-xs font-mono text-foreground outline-none"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {/* Yearly Leave Quotas Configuration */}
      <div className="rounded-lg border border-border/50 bg-card p-3 flex flex-wrap items-center gap-4 font-mono text-xs">
        <span className="text-muted-foreground font-semibold">Yearly Leave Quotas:</span>
        {(["ANNUAL", "SICK", "MATERNITY"] as const).map((lt) => (
          <div key={lt} className="flex items-center gap-1.5">
            <span className="text-[11px]">{lt}:</span>
            <Input
              type="number"
              min={0}
              max={365}
              value={quotaDrafts[lt] ?? 0}
              onChange={(e) =>
                setQuotaDrafts((prev) => ({ ...prev, [lt]: Number(e.target.value) }))
              }
              className="h-7 w-16 px-2 text-xs font-mono"
            />
            <span className="text-[11px] text-muted-foreground">d</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={savingPolicy === lt}
              onClick={() => handleSavePolicy(lt)}
              className="h-7 px-2 text-[11px] font-mono"
            >
              {savingPolicy === lt ? "..." : "Save"}
            </Button>
          </div>
        ))}
      </div>

      {error && (
        <div className="font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/20">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-10 text-center bg-card">
          <RiCalendarCheckLine className="size-8 text-muted-foreground/60 mb-2" />
          <h4 className="font-heading text-sm font-semibold">No Leave Requests</h4>
          <p className="font-mono text-xs text-muted-foreground max-w-sm mt-1">
            Submit leave requests from any employee&apos;s Details dialog.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-mono text-xs">Employee</TableHead>
                <TableHead className="font-mono text-xs">Type</TableHead>
                <TableHead className="font-mono text-xs">Dates</TableHead>
                <TableHead className="font-mono text-xs">Requested</TableHead>
                <TableHead className="font-mono text-xs">Reason & File</TableHead>
                <TableHead className="font-mono text-xs">Assigned Approver</TableHead>
                <TableHead className="font-mono text-xs">Status</TableHead>
                <TableHead className="font-mono text-xs">Reviewed By</TableHead>
                <TableHead className="font-mono text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((lr) => (
                <TableRow key={lr.id} className="font-mono text-xs">
                  <TableCell>
                    <div className="font-sans text-sm font-medium">
                      {lr.employee?.fullName || lr.employeeId.slice(0, 8)}
                    </div>
                    {lr.employee?.employeeCode && (
                      <div className="text-[11px] text-primary font-semibold">
                        {lr.employee.employeeCode}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {lr.leaveType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[11px]">
                    {lr.startDate} &rarr; {lr.endDate}
                  </TableCell>
                  <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {formatDateTime(lr.createdAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[220px]">
                    <div className="truncate">{lr.reason || "—"}</div>
                    {lr.attachmentDataUrl && (
                      <div className="mt-1">
                        <LeaveAttachmentPreview
                          name={lr.attachmentName}
                          mimeType={lr.attachmentMimeType}
                          dataUrl={lr.attachmentDataUrl}
                        />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-[11px]">
                    {lr.assignedApprover ? (
                      <div>
                        <div className="font-medium text-foreground">
                          {lr.assignedApprover.fullName}
                        </div>
                        <div className="text-[10px] text-primary">
                          {lr.assignedApprover.employeeCode}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        HR / Admin
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        lr.status === "APPROVED"
                          ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                          : lr.status === "PENDING"
                          ? "border-amber-500/40 text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {lr.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[11px]">
                    {lr.reviewedBy ? (
                      <div>
                        <div className="font-medium text-foreground">
                          {lr.reviewedBy.fullName || lr.reviewedBy.email || lr.reviewedBy.id}
                        </div>
                        {lr.reviewedAt && (
                          <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatDateTime(lr.reviewedAt)}
                          </div>
                        )}
                      </div>
                    ) : lr.reviewedById ? (
                      <span className="text-muted-foreground">{lr.reviewedById.slice(0, 8)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {lr.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === lr.id}
                            onClick={() => handleReview(lr.id, "APPROVED")}
                            className="h-7 px-2 font-mono text-[11px] text-emerald-600 border-emerald-500/40"
                          >
                            <RiCheckLine className="mr-1 size-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === lr.id}
                            onClick={() => handleReview(lr.id, "REJECTED")}
                            className="h-7 px-2 font-mono text-[11px] text-destructive border-destructive/40"
                          >
                            <RiCloseLine className="mr-1 size-3.5" /> Reject
                          </Button>
                        </>
                      )}
                      {(lr.status === "PENDING" || lr.status === "APPROVED") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busyId === lr.id}
                          onClick={() => handleCancel(lr.id)}
                          className="h-7 px-2 font-mono text-[11px] text-muted-foreground"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
