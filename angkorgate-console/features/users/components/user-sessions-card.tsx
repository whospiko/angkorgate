"use client"

import { useState, useCallback } from "react"
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
  RiShieldCheckLine,
} from "@remixicon/react"
import {
  resolveSessionMetadata,
  formatRelativeTimestamp,
  formatExactTimestamp,
  type SessionDeviceType,
} from "@/lib/session-metadata"
import type { UserSession } from "../types/users.types"
import {
  getAdminUserSessions,
  adminRevokeUserSessionAction,
  adminRevokeOtherUserSessionsAction,
  adminRevokeAllUserSessionsAction,
} from "../server/users-actions"

interface UserSessionsCardProps {
  userId: string
  initialSessions?: UserSession[]
}

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

export function UserSessionsCard({
  userId,
  initialSessions = [],
}: UserSessionsCardProps) {
  const [sessions, setSessions] = useState<UserSession[]>(initialSessions)
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [bulkAction, setBulkAction] = useState<"others" | "all" | null>(null)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const refreshSessions = useCallback(async () => {
    setLoading(true)
    try {
      const list = await getAdminUserSessions(userId)
      setSessions(list)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const handleRevokeOne = async (sessionId: string) => {
    setActionId(sessionId)
    setFeedback(null)
    const res = await adminRevokeUserSessionAction(userId, sessionId)
    setActionId(null)

    if (res.success) {
      setFeedback({ type: "success", text: res.message || "Session revoked." })
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    } else {
      setFeedback({
        type: "error",
        text: res.message || "Failed to revoke session.",
      })
    }
  }

  const handleRevokeOthers = async (keepSessionId?: string) => {
    setBulkAction("others")
    setFeedback(null)
    const res = await adminRevokeOtherUserSessionsAction(userId, keepSessionId)
    setBulkAction(null)

    if (res.success) {
      setFeedback({
        type: "success",
        text: res.message || "All other sessions revoked.",
      })
      await refreshSessions()
    } else {
      setFeedback({
        type: "error",
        text: res.message || "Failed to revoke other sessions.",
      })
    }
  }

  const handleRevokeAll = async () => {
    if (
      !confirm(
        "Revoke ALL active refresh token sessions for this user? They will be forced to sign in again on every device."
      )
    ) {
      return
    }
    setBulkAction("all")
    setFeedback(null)
    const res = await adminRevokeAllUserSessionsAction(userId)
    setBulkAction(null)

    if (res.success) {
      setFeedback({
        type: "success",
        text: res.message || "All sessions revoked.",
      })
      setSessions([])
    } else {
      setFeedback({
        type: "error",
        text: res.message || "Failed to revoke all sessions.",
      })
    }
  }

  const hasCurrentSession = sessions.some((s) => s.isCurrent)
  const hasOtherSessions = sessions.filter((s) => !s.isCurrent).length > 0

  return (
    <Card className="border-border/60 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <RiMacbookLine className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="font-heading text-base font-semibold">
                  Active Refresh Sessions
                </CardTitle>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {sessions.length} Active
                </Badge>
              </div>
              <CardDescription className="text-xs font-mono">
                Tracked refresh token families with parsed OS/browser, client IP, and last active telemetry.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={refreshSessions}
              disabled={loading || bulkAction !== null}
              className="font-mono text-xs gap-1.5"
            >
              <RiRefreshLine className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            {hasCurrentSession && hasOtherSessions && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleRevokeOthers()}
                disabled={bulkAction !== null}
                className="font-mono text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                {bulkAction === "others" ? (
                  <RiLoader4Line className="size-3.5 animate-spin" />
                ) : (
                  <RiShieldCheckLine className="size-3.5" />
                )}
                Revoke All Other Sessions
              </Button>
            )}

            {sessions.length > 0 && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRevokeAll}
                disabled={bulkAction !== null}
                className="font-mono text-xs gap-1.5"
              >
                {bulkAction === "all" ? (
                  <RiLoader4Line className="size-3.5 animate-spin" />
                ) : (
                  <RiDeleteBinLine className="size-3.5" />
                )}
                Revoke All Sessions
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {feedback && (
          <div
            className={`p-3 rounded-md font-mono text-xs flex items-center justify-between gap-2 ${
              feedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-destructive/10 text-destructive border border-destructive/30"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <RiCheckLine className="size-4 shrink-0" />
              ) : (
                <RiCloseLine className="size-4 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="hover:opacity-75"
            >
              <RiCloseLine className="size-3.5" />
            </button>
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="p-6 text-center rounded-lg border border-dashed border-border/60 bg-muted/20 font-mono text-xs text-muted-foreground">
            No active refresh token sessions found for this user.
          </div>
        ) : (
          <div className="divide-y divide-border/40 rounded-md border border-border/50 overflow-hidden bg-card/40">
            {sessions.map((session) => {
              const meta = resolveSessionMetadata(session)
              const DeviceIcon = getDeviceIcon(meta.deviceType)
              const lastActiveIso = session.lastActiveAt || session.createdAt
              return (
                <div
                  key={session.id}
                  className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 rounded-md bg-muted/60 shrink-0 mt-0.5">
                      <DeviceIcon className="size-5 text-primary" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-heading text-sm font-semibold text-foreground">
                          {meta.label}
                        </span>
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {meta.os}
                        </Badge>
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">
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

                      <div className="flex items-center gap-x-4 gap-y-1 flex-wrap font-mono text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 text-foreground/90">
                          <RiMapPinLine className="size-3.5 text-muted-foreground" />
                          {session.ipAddress || "Unknown IP"}
                        </span>
                        <span
                          className="flex items-center gap-1"
                          title={formatExactTimestamp(lastActiveIso)}
                        >
                          <RiPulseLine className="size-3.5 text-emerald-500" />
                          Last Active: {formatRelativeTimestamp(lastActiveIso)}
                        </span>
                        <span
                          className="flex items-center gap-1"
                          title={formatExactTimestamp(session.createdAt)}
                        >
                          <RiTimeLine className="size-3.5" />
                          Started {new Date(session.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {session.userAgent && (
                        <p
                          className="font-mono text-[11px] text-muted-foreground/80 truncate max-w-xl"
                          title={session.userAgent}
                        >
                          {session.userAgent}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                    {sessions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeOthers(session.id)}
                        disabled={bulkAction !== null || actionId === session.id}
                        className="font-mono text-xs h-8 text-muted-foreground hover:text-foreground"
                        title="Keep this session and revoke all other sessions"
                      >
                        Revoke Others
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeOne(session.id)}
                      disabled={actionId === session.id || bulkAction !== null}
                      className="font-mono text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      {actionId === session.id ? (
                        <RiLoader4Line className="size-3.5 animate-spin" />
                      ) : (
                        <RiDeleteBinLine className="size-3.5 mr-1" />
                      )}
                      Revoke
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
