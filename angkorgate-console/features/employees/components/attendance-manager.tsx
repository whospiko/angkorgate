"use client"

import * as React from "react"
import {
  RiAddLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiDownload2Line,
  RiEditLine,
  RiLoginBoxLine,
  RiLogoutBoxLine,
  RiMapPinLine,
  RiRefreshLine,
  RiSettings3Line,
  RiShieldCheckLine,
  RiTimeLine,
} from "@remixicon/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  clockInEmployeeAction,
  clockOutEmployeeAction,
  createAttendancePolicyAction,
  deleteAttendancePolicyAction,
  exportAttendanceCsvAction,
  getAttendanceClientIpAction,
  getAttendanceLogsAction,
  getAttendancePoliciesAction,
  getAttendanceSummaryAction,
  restoreAttendanceLogAction,
  softDeleteAttendanceLogAction,
  updateAttendancePolicyAction,
} from "../server/employees-actions"
import type {
  AttendanceLog,
  AttendancePolicy,
  AttendanceSessionRule,
  AttendanceSummary,
  Department,
  Employee,
} from "../types/employees.types"
import { GpsMapPicker } from "./gps-map-picker"

interface AttendanceManagerProps {
  initialPolicies: AttendancePolicy[]
  initialLogs: AttendanceLog[]
  initialSummary: AttendanceSummary | null
  employees: Employee[]
  departments: Department[]
}

const PRESETS: Record<string, { name: string; sessions: AttendanceSessionRule[] }> = {
  SINGLE: {
    name: "Full Day (1x Check-In / Out)",
    sessions: [{ label: "Full Day", checkInTime: "08:00", checkOutTime: "17:00" }],
  },
  SPLIT: {
    name: "Split Shift (2x Check-In / Out)",
    sessions: [
      { label: "Morning", checkInTime: "08:00", checkOutTime: "11:00" },
      { label: "Afternoon", checkInTime: "13:00", checkOutTime: "17:00" },
    ],
  },
}

const selectClass =
  "h-8 rounded-[0.625rem] border border-input bg-background px-2.5 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring"

export function AttendanceManager({
  initialPolicies,
  initialLogs,
  initialSummary,
  employees,
  departments,
}: AttendanceManagerProps) {
  const [policies, setPolicies] = React.useState<AttendancePolicy[]>(initialPolicies)
  const [logs, setLogs] = React.useState<AttendanceLog[]>(initialLogs)
  const [summary, setSummary] = React.useState<AttendanceSummary | null>(initialSummary)
  const [banner, setBanner] = React.useState<{ type: "ok" | "err"; text: string } | null>(null)
  const [isPending, startTransition] = React.useTransition()

  // Policy Builder Form State
  const [editingPolicyId, setEditingPolicyId] = React.useState<string | null>(null)
  const [showBuilder, setShowBuilder] = React.useState(initialPolicies.length === 0)
  const [policyName, setPolicyName] = React.useState("Split Shift (2x Check-In / Out)")
  const [departmentId, setDepartmentId] = React.useState("")
  const [graceMinutes, setGraceMinutes] = React.useState(5)
  const [earlyLeaveGraceMinutes, setEarlyLeaveGraceMinutes] = React.useState(5)
  const [isDefault, setIsDefault] = React.useState(true)
  const [isActive, setIsActive] = React.useState(true)
  const [allowSelfServiceWeb, setAllowSelfServiceWeb] = React.useState(true)
  const [allowedIpsText, setAllowedIpsText] = React.useState("")
  const [requireGeofence, setRequireGeofence] = React.useState(false)
  const [officeLatitude, setOfficeLatitude] = React.useState("")
  const [officeLongitude, setOfficeLongitude] = React.useState("")
  const [geofenceRadiusMeters, setGeofenceRadiusMeters] = React.useState(100)
  const [showMapPicker, setShowMapPicker] = React.useState(false)
  const [sessions, setSessions] = React.useState<AttendanceSessionRule[]>(PRESETS.SPLIT.sessions)

  // Live Clock-In / Out State
  const [selectedEmpId, setSelectedEmpId] = React.useState(employees[0]?.id ?? "")
  const [clockNote, setClockNote] = React.useState("")
  const [filterEmpId, setFilterEmpId] = React.useState("")
  const [showDeleted, setShowDeleted] = React.useState(false)
  const [deletingLogId, setDeletingLogId] = React.useState<string | null>(null)
  const [deleteReason, setDeleteReason] = React.useState("")

  const departmentNameById = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const d of departments) {
      if (d.id) map.set(d.id, d.name)
    }
    return map
  }, [departments])

  const resetBuilder = (presetKey?: "SINGLE" | "SPLIT") => {
    setEditingPolicyId(null)
    const preset = presetKey ? PRESETS[presetKey] : PRESETS.SPLIT
    setPolicyName(preset.name)
    setSessions(preset.sessions.map((s) => ({ ...s })))
    setDepartmentId("")
    setGraceMinutes(5)
    setEarlyLeaveGraceMinutes(5)
    setIsDefault(policies.length === 0)
    setIsActive(true)
    setAllowSelfServiceWeb(true)
    setAllowedIpsText("")
    setRequireGeofence(false)
    setOfficeLatitude("")
    setOfficeLongitude("")
    setGeofenceRadiusMeters(100)
    setShowMapPicker(false)
    setShowBuilder(true)
  }

  const startEditPolicy = (policy: AttendancePolicy) => {
    setEditingPolicyId(policy.id)
    setPolicyName(policy.name)
    setDepartmentId(policy.departmentId ?? "")
    setGraceMinutes(policy.graceMinutes ?? 5)
    setEarlyLeaveGraceMinutes(policy.earlyLeaveGraceMinutes ?? 5)
    setIsDefault(policy.isDefault)
    setIsActive(policy.isActive)
    setAllowSelfServiceWeb(policy.allowSelfServiceWeb ?? true)
    setAllowedIpsText((policy.allowedIps || []).join(", "))
    setRequireGeofence(policy.requireGeofence ?? false)
    setOfficeLatitude(
      typeof policy.officeLatitude === "number" ? String(policy.officeLatitude) : ""
    )
    setOfficeLongitude(
      typeof policy.officeLongitude === "number" ? String(policy.officeLongitude) : ""
    )
    setGeofenceRadiusMeters(policy.geofenceRadiusMeters ?? 100)
    setShowMapPicker(policy.requireGeofence ?? false)
    setSessions(
      policy.sessions?.length
        ? policy.sessions.map((s) => ({ ...s }))
        : [{ label: "Session 1", checkInTime: "08:00", checkOutTime: "17:00" }]
    )
    setShowBuilder(true)
  }

  const refreshAttendanceData = async (
    empFilter = filterEmpId,
    includeDel = showDeleted
  ) => {
    const [nextPolicies, nextLogs, nextSummary] = await Promise.all([
      getAttendancePoliciesAction(),
      getAttendanceLogsAction(empFilter || undefined, includeDel),
      getAttendanceSummaryAction(empFilter ? { employeeId: empFilter } : undefined),
    ])
    setPolicies(nextPolicies)
    setLogs(nextLogs)
    setSummary(nextSummary)
  }

  const handleConfirmDeleteLog = (logId: string) => {
    setBanner(null)
    startTransition(async () => {
      const res = await softDeleteAttendanceLogAction(logId, deleteReason)
      if (!res.success) {
        setBanner({ type: "err", text: res.message || "Failed to delete attendance log" })
        return
      }
      setDeletingLogId(null)
      setDeleteReason("")
      setBanner({ type: "ok", text: "Attendance log soft-deleted (audit tracked)." })
      await refreshAttendanceData()
    })
  }

  const handleRestoreLog = (logId: string) => {
    setBanner(null)
    startTransition(async () => {
      const res = await restoreAttendanceLogAction(logId)
      if (!res.success) {
        setBanner({ type: "err", text: res.message || "Failed to restore attendance log" })
        return
      }
      setBanner({ type: "ok", text: "Attendance log restored." })
      await refreshAttendanceData()
    })
  }

  const handleUseCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setBanner({ type: "err", text: "Browser geolocation is not available." })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOfficeLatitude(pos.coords.latitude.toFixed(6))
        setOfficeLongitude(pos.coords.longitude.toFixed(6))
        setRequireGeofence(true)
        setShowMapPicker(true)
      },
      () => {
        setBanner({ type: "err", text: "Unable to read GPS location. Allow location permission in browser." })
      },
      { enableHighAccuracy: true, timeout: 6000 }
    )
  }

  const handleDetectCurrentIp = () => {
    setBanner(null)
    startTransition(async () => {
      const ip = await getAttendanceClientIpAction()
      if (!ip) {
        setBanner({ type: "err", text: "Unable to detect server-seen IP." })
        return
      }
      const existing = allowedIpsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      if (!existing.includes(ip)) {
        setAllowedIpsText([...existing, ip].join(", "))
      }
      setBanner({ type: "ok", text: `Detected server-seen IP: ${ip}` })
    })
  }

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault()
    setBanner(null)
    startTransition(async () => {
      const parsedIps = allowedIpsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
      const parsedLat = officeLatitude.trim() ? Number(officeLatitude.trim()) : null
      const parsedLng = officeLongitude.trim() ? Number(officeLongitude.trim()) : null

      const payload = {
        name: policyName.trim(),
        departmentId: departmentId || null,
        isDefault,
        graceMinutes: Number(graceMinutes) || 0,
        earlyLeaveGraceMinutes: Number(earlyLeaveGraceMinutes) || 0,
        isActive,
        allowSelfServiceWeb,
        allowedIps: parsedIps.length > 0 ? parsedIps : null,
        requireGeofence,
        officeLatitude: parsedLat,
        officeLongitude: parsedLng,
        geofenceRadiusMeters: Number(geofenceRadiusMeters) || 100,
        sessions: sessions.map((s, idx) => ({
          label: s.label.trim() || `Session ${idx + 1}`,
          checkInTime: s.checkInTime,
          checkOutTime: s.checkOutTime,
        })),
      }
      const res = editingPolicyId
        ? await updateAttendancePolicyAction(editingPolicyId, payload)
        : await createAttendancePolicyAction(payload)

      if (!res.success) {
        setBanner({ type: "err", text: res.message || "Failed to save policy" })
        return
      }
      setBanner({
        type: "ok",
        text: editingPolicyId ? "Attendance policy updated." : "Attendance policy created.",
      })
      setShowBuilder(false)
      setEditingPolicyId(null)
      await refreshAttendanceData()
    })
  }

  const handleDeletePolicy = (id: string) => {
    setBanner(null)
    startTransition(async () => {
      const res = await deleteAttendancePolicyAction(id)
      if (!res.success) {
        setBanner({ type: "err", text: res.message || "Failed to delete policy" })
        return
      }
      setBanner({ type: "ok", text: "Attendance policy deleted." })
      await refreshAttendanceData()
    })
  }

  const handleClock = (mode: "in" | "out") => {
    if (!selectedEmpId) return
    setBanner(null)
    startTransition(async () => {
      const res =
        mode === "in"
          ? await clockInEmployeeAction(selectedEmpId, clockNote)
          : await clockOutEmployeeAction(selectedEmpId, clockNote)
      if (!res.success) {
        setBanner({ type: "err", text: res.message || `Clock-${mode} failed` })
        return
      }
      setClockNote("")
      setBanner({
        type: "ok",
        text: mode === "in" ? "Clock-in recorded." : "Clock-out recorded.",
      })
      await refreshAttendanceData()
    })
  }

  const handleExportCsv = () => {
    startTransition(async () => {
      const res = await exportAttendanceCsvAction(
        filterEmpId ? { employeeId: filterEmpId } : undefined
      )
      if (!res.success || !res.data) {
        setBanner({ type: "err", text: res.message || "Export failed" })
        return
      }
      const blob = new Blob([res.data.csv], { type: res.data.contentType || "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = res.data.filename || "attendance.csv"
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  const activePoliciesCount = policies.filter((p) => p.isActive).length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Attendance & Check-In Policies
          </h1>
          <p className="text-xs font-mono text-muted-foreground">
            Configure 1x full-day or multi-session split shifts, grace periods, and monitor live clock-in/out logs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => resetBuilder("SINGLE")}
          >
            Preset: 1x Full Day
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => resetBuilder("SPLIT")}
          >
            Preset: 2x Split Shift
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (showBuilder && !editingPolicyId) {
                setShowBuilder(false)
              } else {
                resetBuilder("SPLIT")
              }
            }}
          >
            <RiAddLine className="mr-1.5 size-4" />
            New Policy
          </Button>
        </div>
      </div>

      {banner && (
        <div
          className={`rounded-[0.625rem] border px-3 py-2 text-xs font-mono ${
            banner.type === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-[11px] uppercase">
              Active Policies
            </CardDescription>
            <CardTitle className="font-heading text-2xl">{activePoliciesCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-[11px] uppercase">
              Attendance Logs
            </CardDescription>
            <CardTitle className="font-heading text-2xl">
              {summary?.totalLogs ?? logs.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-[11px] uppercase">
              On-Time / Late
            </CardDescription>
            <CardTitle className="font-heading text-2xl">
              {summary?.onTimeCount ?? 0}{" "}
              <span className="text-sm font-mono text-amber-400">
                / {summary?.lateCount ?? 0} late
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-[11px] uppercase">
              Worked Hours
            </CardDescription>
            <CardTitle className="font-heading text-2xl">
              {summary?.totalWorkedHours ?? 0}h
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Dynamic Policy Builder */}
      {showBuilder && (
        <Card className="border-primary/40">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <RiSettings3Line className="size-4 text-primary" />
                <CardTitle className="font-heading text-base">
                  {editingPolicyId ? "Edit Attendance Policy" : "Create Attendance Policy"}
                </CardTitle>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowBuilder(false)
                  setEditingPolicyId(null)
                }}
              >
                Cancel
              </Button>
            </div>
            <CardDescription className="text-xs font-mono">
              Add 1 session for a standard 08:00–17:00 shift, or 2+ sessions for split shifts (e.g. 08:00–11:00 and 13:00–17:00).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSavePolicy} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[11px] font-mono text-muted-foreground">
                    Policy Name
                  </label>
                  <Input
                    value={policyName}
                    onChange={(e) => setPolicyName(e.target.value)}
                    placeholder="e.g. Clinic Split Shift (2x)"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-muted-foreground">
                    Department Scope
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className={`${selectClass} w-full`}
                  >
                    <option value="">All Departments (Global)</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-muted-foreground">
                      Grace (min)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={120}
                      value={graceMinutes}
                      onChange={(e) => setGraceMinutes(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-muted-foreground">
                      Early Out (m)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={120}
                      value={earlyLeaveGraceMinutes}
                      onChange={(e) => setEarlyLeaveGraceMinutes(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Sessions Rows */}
              <div className="space-y-2 rounded-[0.625rem] border border-border/60 bg-muted/20 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold">
                    Check-In / Check-Out Sessions ({sessions.length})
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSessions((prev) => [
                        ...prev,
                        {
                          label: `Session ${prev.length + 1}`,
                          checkInTime: "13:00",
                          checkOutTime: "17:00",
                        },
                      ])
                    }
                  >
                    <RiAddLine className="mr-1 size-3.5" />
                    Add Session
                  </Button>
                </div>

                <div className="space-y-2">
                  {sessions.map((session, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 gap-2 rounded-[0.625rem] border border-border/40 bg-background/60 p-2.5 sm:grid-cols-12 sm:items-center"
                    >
                      <div className="sm:col-span-5">
                        <Input
                          value={session.label}
                          onChange={(e) =>
                            setSessions((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, label: e.target.value } : item
                              )
                            )
                          }
                          placeholder={`Session ${idx + 1} label`}
                        />
                      </div>
                      <div className="sm:col-span-3 flex items-center gap-1.5">
                        <span className="text-[11px] font-mono text-muted-foreground">In</span>
                        <Input
                          type="time"
                          value={session.checkInTime}
                          onChange={(e) =>
                            setSessions((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, checkInTime: e.target.value } : item
                              )
                            )
                          }
                          required
                        />
                      </div>
                      <div className="sm:col-span-3 flex items-center gap-1.5">
                        <span className="text-[11px] font-mono text-muted-foreground">Out</span>
                        <Input
                          type="time"
                          value={session.checkOutTime}
                          onChange={(e) =>
                            setSessions((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, checkOutTime: e.target.value } : item
                              )
                            )
                          }
                          required
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={sessions.length <= 1}
                          onClick={() =>
                            setSessions((prev) => prev.filter((_, i) => i !== idx))
                          }
                          title="Remove session"
                        >
                          <RiDeleteBinLine className="size-4 text-rose-400" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Anti-Spoof & Location Verification */}
              <div className="space-y-3 rounded-[0.625rem] border border-border/60 bg-muted/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-semibold">
                    <RiShieldCheckLine className="size-4 text-primary" />
                    Anti-Spoof & Location Verification
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={handleDetectCurrentIp}
                    >
                      <RiShieldCheckLine className="mr-1 size-3.5" />
                      Detect Current IP
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMapPicker((prev) => !prev)}
                    >
                      <RiMapPinLine className="mr-1 size-3.5" />
                      {showMapPicker ? "Hide Map" : "Select GPS on Map"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUseCurrentLocation}
                    >
                      <RiMapPinLine className="mr-1 size-3.5" />
                      Use Current Office GPS
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-muted-foreground">
                      Allowed Office / Clinic Wi-Fi IPs (comma-separated, optional)
                    </label>
                    <Input
                      value={allowedIpsText}
                      onChange={(e) => setAllowedIpsText(e.target.value)}
                      placeholder="e.g. 203.189.132.45, 192.168.1.0/24"
                    />
                    <p className="text-[10px] font-mono text-muted-foreground">
                      Note: On localhost dev, the server sees 127.0.0.1. In production behind a proxy, it sees your clinic&apos;s public/LAN IP.
                    </p>
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-xs font-mono cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowSelfServiceWeb}
                        onChange={(e) => setAllowSelfServiceWeb(e.target.checked)}
                        className="rounded border-input"
                      />
                      Allow remote web self-service clock-in (/account)
                    </label>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-4 items-end">
                  <label className="flex items-center gap-2 text-xs font-mono cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={requireGeofence}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setRequireGeofence(checked)
                        if (checked) setShowMapPicker(true)
                      }}
                      className="rounded border-input"
                    />
                    Require GPS Geofence
                  </label>
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-muted-foreground">
                      Office Latitude
                    </label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={officeLatitude}
                      onChange={(e) => setOfficeLatitude(e.target.value)}
                      placeholder="11.556400"
                      disabled={!requireGeofence}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-muted-foreground">
                      Office Longitude
                    </label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={officeLongitude}
                      onChange={(e) => setOfficeLongitude(e.target.value)}
                      placeholder="104.928200"
                      disabled={!requireGeofence}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-mono text-muted-foreground">
                        Radius (meters)
                      </label>
                      <div className="flex items-center gap-1">
                        {[2, 10, 50, 100].map((r) => (
                          <button
                            key={r}
                            type="button"
                            disabled={!requireGeofence}
                            onClick={() => setGeofenceRadiusMeters(r)}
                            className={`rounded px-1.5 py-0.5 font-mono text-[10px] border transition-colors ${
                              geofenceRadiusMeters === r
                                ? "border-primary bg-primary/20 text-primary"
                                : "border-border/60 text-muted-foreground hover:text-foreground"
                            } disabled:opacity-40`}
                          >
                            {r}m
                          </button>
                        ))}
                      </div>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      max={10000}
                      value={geofenceRadiusMeters}
                      onChange={(e) => setGeofenceRadiusMeters(Number(e.target.value))}
                      disabled={!requireGeofence}
                    />
                  </div>
                </div>

                {showMapPicker && (
                  <GpsMapPicker
                    latitude={officeLatitude.trim() ? Number(officeLatitude.trim()) : null}
                    longitude={officeLongitude.trim() ? Number(officeLongitude.trim()) : null}
                    radiusMeters={Number(geofenceRadiusMeters) || 100}
                    onChange={(lat, lng) => {
                      setOfficeLatitude(lat.toFixed(6))
                      setOfficeLongitude(lng.toFixed(6))
                      setRequireGeofence(true)
                    }}
                  />
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="rounded border-input"
                    />
                    Default global policy
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded border-input"
                    />
                    Active
                  </label>
                </div>
                <Button type="submit" size="sm" disabled={isPending}>
                  <RiCheckLine className="mr-1.5 size-4" />
                  {editingPolicyId ? "Update Policy" : "Save Policy"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Configured Policies List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RiSettings3Line className="size-4 text-primary" />
            <CardTitle className="font-heading text-base">
              Configured Attendance Policies
            </CardTitle>
          </div>
          <CardDescription className="text-xs font-mono">
            Department-specific policies override the default global policy during employee clock-in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {policies.length === 0 ? (
            <div className="rounded-[0.625rem] border border-dashed border-border/60 p-6 text-center text-xs font-mono text-muted-foreground">
              No custom attendance policies configured yet. Click &ldquo;New Policy&rdquo; or choose a preset above.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {policies.map((pol) => (
                <div
                  key={pol.id}
                  className="flex flex-col justify-between gap-3 rounded-[0.625rem] border border-border/60 bg-muted/20 p-3.5"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-heading text-sm font-semibold">{pol.name}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">
                          {pol.departmentId
                            ? `Dept: ${departmentNameById.get(pol.departmentId) || pol.departmentId}`
                            : "Global Scope"}{" "}
                          · Grace {pol.graceMinutes}m
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {pol.isDefault && (
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                            Default
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            pol.isActive
                              ? "border-emerald-500/30 text-emerald-300"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {pol.isActive ? "Active" : "Paused"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(pol.sessions || []).map((s, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="font-mono text-[11px] bg-background/60"
                        >
                          #{idx + 1} {s.label}: {s.checkInTime} – {s.checkOutTime}
                        </Badge>
                      ))}
                      {pol.allowSelfServiceWeb === false && (
                        <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px]">
                          Front-Desk Only
                        </Badge>
                      )}
                      {pol.allowedIps && pol.allowedIps.length > 0 && (
                        <Badge className="bg-sky-500/15 text-sky-300 border-sky-500/30 text-[10px]">
                          Wi-Fi IP Lock ({pol.allowedIps.length})
                        </Badge>
                      )}
                      {pol.requireGeofence && (
                        <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]">
                          GPS ≤ {pol.geofenceRadiusMeters ?? 100}m
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 border-t border-border/40 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditPolicy(pol)}
                    >
                      <RiEditLine className="mr-1 size-3.5" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleDeletePolicy(pol.id)}
                    >
                      <RiDeleteBinLine className="mr-1 size-3.5 text-rose-400" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Clock-In / Clock-Out & Timesheet Logs */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <RiTimeLine className="size-4 text-primary" />
              <CardTitle className="font-heading text-base">
                Live Attendance Clock & Timesheets
              </CardTitle>
            </div>
            <CardDescription className="text-xs font-mono">
              Record multi-session shift check-ins/check-outs and export CSV timesheets.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 rounded-[0.625rem] border border-border/60 bg-muted/30 px-2.5 py-1.5 text-xs font-mono cursor-pointer">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => {
                  const next = e.target.checked
                  setShowDeleted(next)
                  startTransition(async () => {
                    await refreshAttendanceData(filterEmpId, next)
                  })
                }}
                className="rounded border-input"
              />
              Show Deleted
            </label>
            <select
              value={filterEmpId}
              onChange={(e) => {
                const next = e.target.value
                setFilterEmpId(next)
                startTransition(async () => {
                  await refreshAttendanceData(next, showDeleted)
                })
              }}
              className={selectClass}
            >
              <option value="">All Staff</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName} ({e.employeeCode})
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={handleExportCsv}
            >
              <RiDownload2Line className="mr-1.5 size-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-[0.625rem] border border-border/60 bg-muted/20 p-3">
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className={`${selectClass} min-w-[210px]`}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName} ({e.employeeCode})
                </option>
              ))}
            </select>
            <Input
              value={clockNote}
              onChange={(e) => setClockNote(e.target.value)}
              placeholder="Optional shift note (e.g. Morning / Front desk)"
              className="max-w-xs"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending || !selectedEmpId}
              className="border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
              onClick={() => handleClock("in")}
            >
              <RiLoginBoxLine className="mr-1.5 size-4" />
              Clock In
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending || !selectedEmpId}
              className="border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
              onClick={() => handleClock("out")}
            >
              <RiLogoutBoxLine className="mr-1.5 size-4" />
              Clock Out
            </Button>
          </div>

          <div className="w-full overflow-x-auto rounded-[0.625rem] border border-border/60">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Employee</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Worked</TableHead>
                  <TableHead>Source / IP</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-6 text-center text-xs font-mono text-muted-foreground">
                      No attendance logs recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.slice(0, 30).map((log) => (
                    <TableRow
                      key={log.id}
                      className={log.deletedAt ? "bg-rose-500/5 opacity-80" : undefined}
                    >
                      <TableCell className="font-medium text-xs">
                        <div>{log.employee?.fullName || log.employeeId.slice(0, 8)}</div>
                        {log.deletedAt && (
                          <div className="mt-0.5 text-[10px] font-mono text-rose-300">
                            Deleted by {log.deletedBy?.fullName || log.deletedBy?.email || log.deletedById?.slice(0, 8) || "Admin"}
                            {log.deleteReason ? ` · "${log.deleteReason}"` : ""}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.sessionIndex !== null && log.sessionIndex !== undefined
                          ? `#${log.sessionIndex + 1}`
                          : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {new Date(log.clockInAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.clockOutAt ? (
                          new Date(log.clockOutAt).toLocaleString()
                        ) : (
                          <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <div className="flex flex-wrap gap-1">
                          {log.deletedAt && (
                            <Badge className="bg-rose-500/15 text-rose-300 border-rose-500/30 text-[10px]">
                              DELETED
                            </Badge>
                          )}
                          {log.status === "LATE" ? (
                            <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px]">
                              LATE +{log.lateMinutes ?? 0}m
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]">
                              ON TIME
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.workedMinutes !== null && log.workedMinutes !== undefined
                          ? `${(log.workedMinutes / 60).toFixed(1)}h`
                          : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <div>{log.source}</div>
                        {(log.clockInIp || typeof log.distanceMeters === "number") && (
                          <div className="text-[10px] text-muted-foreground">
                            {log.clockInIp || ""}
                            {typeof log.distanceMeters === "number"
                              ? ` (${log.distanceMeters}m)`
                              : ""}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.notes || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {log.deletedAt ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleRestoreLog(log.id)}
                            className="h-7 px-2 font-mono text-[11px] text-emerald-300 border-emerald-500/30"
                          >
                            <RiRefreshLine className="mr-1 size-3.5" />
                            Restore
                          </Button>
                        ) : deletingLogId === log.id ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Input
                              value={deleteReason}
                              onChange={(e) => setDeleteReason(e.target.value)}
                              placeholder="Reason (optional)"
                              className="h-7 w-36 text-[11px] font-mono"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              disabled={isPending}
                              onClick={() => handleConfirmDeleteLog(log.id)}
                              className="h-7 px-2 font-mono text-[11px]"
                            >
                              Confirm
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setDeletingLogId(null)
                                setDeleteReason("")
                              }}
                              className="h-7 px-2 font-mono text-[11px]"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() => {
                              setDeletingLogId(log.id)
                              setDeleteReason("")
                            }}
                            title="Soft delete attendance log"
                          >
                            <RiDeleteBinLine className="size-4 text-rose-400" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
