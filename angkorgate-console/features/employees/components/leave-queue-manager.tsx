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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RiCalendarCheckLine, RiCheckLine, RiCloseLine } from "@remixicon/react"
import type { LeaveRequest } from "../types/employees.types"
import {
  reviewLeaveRequestAction,
  cancelLeaveRequestAction,
} from "../server/employees-actions"

interface LeaveQueueManagerProps {
  leaveRequests: LeaveRequest[]
}

export function LeaveQueueManager({ leaveRequests }: LeaveQueueManagerProps) {
  const [statusFilter, setStatusFilter] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filtered = statusFilter
    ? leaveRequests.filter((lr) => lr.status === statusFilter)
    : leaveRequests

  const handleReview = async (id: string, decision: "APPROVED" | "REJECTED") => {
    setBusyId(id)
    setError(null)
    const res = await reviewLeaveRequestAction(id, decision)
    setBusyId(null)
    if (!res.success) {
      setError(res.message || "Failed to review leave request")
    }
  }

  const handleCancel = async (id: string) => {
    setBusyId(id)
    setError(null)
    const res = await cancelLeaveRequestAction(id)
    setBusyId(null)
    if (!res.success) {
      setError(res.message || "Failed to cancel leave request")
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
                <TableHead className="font-mono text-xs">Reason</TableHead>
                <TableHead className="font-mono text-xs">Status</TableHead>
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
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {lr.reason || "—"}
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
