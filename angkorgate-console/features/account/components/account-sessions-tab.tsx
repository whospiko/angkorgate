"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  RiMacbookLine,
  RiSmartphoneLine,
  RiGlobalLine,
  RiDeleteBinLine,
  RiLoader4Line,
  RiCheckLine,
  RiCloseLine,
  RiRefreshLine,
  RiTimeLine,
} from "@remixicon/react"
import type { AccountSession } from "../types/account.types"
import {
  getMySessionsAction,
  revokeSessionAction,
  logoutAllSessionsAction,
} from "../server/account-actions"

export function AccountSessionsTab() {
  const [sessions, setSessions] = useState<AccountSession[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [revokingAll, setRevokingAll] = useState(false)
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
    loadSessions()
  }, [loadSessions])

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

  const handleRevokeAll = async () => {
    setRevokingAll(true)
    setFeedback(null)
    const res = await logoutAllSessionsAction()
    setRevokingAll(false)

    if (res.success) {
      setFeedback({ type: "success", message: res.message || "All sessions revoked." })
      await loadSessions()
    } else {
      setFeedback({ type: "error", message: res.message || "Failed to revoke sessions." })
    }
  }

  const parseDevice = (userAgent?: string | null) => {
    if (!userAgent) return { icon: RiGlobalLine, label: "Unknown Device" }
    const ua = userAgent.toLowerCase()
    if (ua.includes("iphone") || ua.includes("android") || ua.includes("mobile")) {
      return { icon: RiSmartphoneLine, label: "Mobile Device" }
    }
    if (ua.includes("mac") || ua.includes("darwin")) {
      return { icon: RiMacbookLine, label: "macOS Device" }
    }
    if (ua.includes("windows")) {
      return { icon: RiMacbookLine, label: "Windows PC" }
    }
    if (ua.includes("linux")) {
      return { icon: RiMacbookLine, label: "Linux Device" }
    }
    return { icon: RiGlobalLine, label: "Web Browser" }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="space-y-1">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <RiMacbookLine className="h-5 w-5 text-primary" />
              Active Browser & App Sessions
            </CardTitle>
            <CardDescription>
              Manage devices and client apps where you are currently signed in.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadSessions}
              disabled={loading}
              className="border-border text-xs gap-1"
            >
              <RiRefreshLine className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {sessions.filter((s) => !s.isCurrent).length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRevokeAll}
                disabled={revokingAll}
                className="text-xs gap-1"
              >
                {revokingAll ? (
                  <RiLoader4Line className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RiDeleteBinLine className="h-3.5 w-3.5" />
                )}
                Revoke All Others
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {feedback && (
            <div
              className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm font-sans ${
                feedback.type === "success"
                  ? "bg-green-500/10 text-green-500 border border-green-500/20"
                  : "bg-red-500/10 text-red-500 border border-red-500/20"
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
                const { icon: DeviceIcon, label } = parseDevice(session.userAgent)
                return (
                  <div
                    key={session.id}
                    className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted border border-border/50 text-foreground mt-0.5">
                        <DeviceIcon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground">
                            {label}
                          </span>
                          {session.isCurrent && (
                            <Badge
                              variant="outline"
                              className="border-green-500/40 bg-green-500/10 text-green-500 font-mono text-xs"
                            >
                              THIS DEVICE
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate max-w-md">
                          {session.userAgent || "Unknown client"}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                          {session.ipAddress && (
                            <span>IP: {session.ipAddress}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <RiTimeLine className="h-3 w-3" />
                            Started {new Date(session.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!session.isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeOne(session.id)}
                        disabled={actionId === session.id}
                        className="text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10 h-8"
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
