"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  RiMacbookLine,
  RiSmartphoneLine,
  RiTabletLine,
  RiTerminalBoxLine,
  RiGlobalLine,
  RiDeleteBinLine,
  RiLoader4Line,
  RiCheckLine,
  RiCloseLine,
  RiRefreshLine,
  RiTimeLine,
  RiMapPinLine,
  RiPulseLine,
} from "@remixicon/react"
import {
  resolveSessionMetadata,
  formatRelativeTimestamp,
  formatExactTimestamp,
  type SessionDeviceType,
} from "@/lib/session-metadata"
import type { AccountSession } from "../types/account.types"
import {
  getMySessionsAction,
  revokeSessionAction,
  revokeOtherSessionsAction,
  logoutAllSessionsAction,
} from "../server/account-actions"

function getDeviceIcon(deviceType: SessionDeviceType) {
  switch (deviceType) {
    case "mobile":
      return RiSmartphoneLine
    case "tablet":
      return RiTabletLine
    case "cli":
      return RiTerminalBoxLine
    case "desktop":
      return RiMacbookLine
    default:
      return RiGlobalLine
  }
}

export function AccountSessionsTab() {
  const [sessions, setSessions] = useState<AccountSession[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [revokingOthers, setRevokingOthers] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const loadSessions = useCallback(async () => {
    setLoading(true)
    const list = await getMySessionsAction()
    setSessions(list)
    setLoading(false)
  }, [])

  useEffect(() => {
    let active = true
    void getMySessionsAction().then((list) => {
      if (!active) return
      setSessions(list)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const handleRevokeOne = async (sessionId: string) => {
    setActionId(sessionId)
    setFeedback(null)
    const res = await revokeSessionAction(sessionId)
    setActionId(null)

    if (res.success) {
      setFeedback({ type: "success", message: res.message || "Session terminated." })
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    } else {
      setFeedback({ type: "error", message: res.message || "Failed to terminate session." })
    }
  }

  const hasCurrentSession = sessions.some((s) => s.isCurrent)
  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length

  const handleRevokeOthers = async () => {
    setRevokingOthers(true)
    setFeedback(null)
    const res = hasCurrentSession
      ? await revokeOtherSessionsAction()
      : await logoutAllSessionsAction()
    setRevokingOthers(false)

    if (res.success) {
      setFeedback({
        type: "success",
        message: res.message || "Other sessions revoked.",
      })
      await loadSessions()
    } else {
      setFeedback({
        type: "error",
        message: res.message || "Failed to revoke sessions.",
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
          <div className="space-y-1">
            <CardTitle className="font-heading text-lg font-semibold flex items-center gap-2">
              <RiMacbookLine className="h-5 w-5 text-primary" />
              Active Browser & App Sessions
            </CardTitle>
            <CardDescription className="text-xs font-mono">
              Inspect recognized browsers, operating systems, IP addresses, and recent activity across your devices.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={loadSessions}
              disabled={loading}
              className="border-border font-mono text-xs gap-1"
            >
              <RiRefreshLine className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {otherSessionsCount > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRevokeOthers}
                disabled={revokingOthers}
                className="font-mono text-xs gap-1"
              >
                {revokingOthers ? (
                  <RiLoader4Line className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RiDeleteBinLine className="h-3.5 w-3.5" />
                )}
                {hasCurrentSession ? "Revoke All Other Sessions" : "Revoke All Sessions"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {feedback && (
            <div
              className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-xs font-mono ${
                feedback.type === "success"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
            >
              {feedback.type === "success" ? (
                <RiCheckLine className="h-4 w-4 shrink-0" />
              ) : (
                <RiCloseLine className="h-4 w-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <RiLoader4Line className="h-6 w-6 animate-spin mb-2" />
              <p className="text-xs font-mono">Loading active sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm font-mono">
              No active sessions found.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sessions.map((session) => {
                const meta = resolveSessionMetadata(session)
                const DeviceIcon = getDeviceIcon(meta.deviceType)
                const lastActiveIso = session.lastActiveAt || session.createdAt
                return (
                  <div
                    key={session.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2.5 rounded-lg bg-muted/60 border border-border/50 text-foreground mt-0.5 shrink-0">
                        <DeviceIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-heading font-semibold text-sm text-foreground">
                            {meta.label}
                          </span>
                          <Badge
                            variant="secondary"
                            className="font-mono text-[10px] uppercase"
                          >
                            {meta.os}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="font-mono text-[10px] uppercase"
                          >
                            {meta.deviceType}
                          </Badge>
                          {session.isCurrent && (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]"
                            >
                              THIS DEVICE
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-muted-foreground font-mono">
                          <span className="flex items-center gap-1 text-foreground/90">
                            <RiMapPinLine className="h-3.5 w-3.5 text-muted-foreground" />
                            {session.ipAddress || "Unknown IP"}
                          </span>
                          <span
                            className="flex items-center gap-1"
                            title={formatExactTimestamp(lastActiveIso)}
                          >
                            <RiPulseLine className="h-3.5 w-3.5 text-emerald-500" />
                            Last Active: {formatRelativeTimestamp(lastActiveIso)}
                          </span>
                          <span
                            className="flex items-center gap-1"
                            title={formatExactTimestamp(session.createdAt)}
                          >
                            <RiTimeLine className="h-3.5 w-3.5" />
                            Started {new Date(session.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {session.userAgent && (
                          <p
                            className="text-[11px] text-muted-foreground/80 font-mono truncate max-w-xl"
                            title={session.userAgent}
                          >
                            {session.userAgent}
                          </p>
                        )}
                      </div>
                    </div>

                    {!session.isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeOne(session.id)}
                        disabled={actionId === session.id}
                        className="text-xs font-mono text-destructive hover:text-destructive hover:bg-destructive/10 h-8 self-end sm:self-center shrink-0"
                      >
                        {actionId === session.id ? (
                          <RiLoader4Line className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RiDeleteBinLine className="h-3.5 w-3.5 mr-1" />
                        )}
                        Revoke
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
