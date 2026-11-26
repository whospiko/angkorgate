"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  RiCheckLine,
  RiDeleteBinLine,
  RiExternalLinkLine,
  RiFileCopyLine,
  RiInboxLine,
  RiKey2Line,
  RiLoader4Line,
  RiMailSendLine,
  RiRefreshLine,
  RiSmartphoneLine,
} from "@remixicon/react"
import {
  clearDevOutboxAction,
  getDevOutboxAction,
  type DevOutboxMessage,
} from "../server/dev-outbox-actions"

export function DevOutboxViewer({
  initialMessages,
}: {
  initialMessages: DevOutboxMessage[]
}) {
  const [messages, setMessages] = useState<DevOutboxMessage[]>(initialMessages)
  const [filter, setFilter] = useState<"all" | "email" | "sms">("all")
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const res = await getDevOutboxAction()
    if (res.success && res.messages) {
      setMessages(res.messages)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const timer = setInterval(() => {
      void refresh()
    }, 4000)
    return () => clearInterval(timer)
  }, [autoRefresh, refresh])

  const handleClear = async () => {
    setLoading(true)
    const res = await clearDevOutboxAction()
    if (res.success) {
      setMessages([])
    }
    setLoading(false)
  }

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(key)
      setTimeout(() => setCopiedId((prev) => (prev === key ? null : prev)), 1500)
    } catch {
      // Ignore clipboard failures in restricted contexts
    }
  }

  const visibleMessages =
    filter === "all"
      ? messages
      : messages.filter((m) => m.channel === filter)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as "all" | "email" | "sms")}
        >
          <TabsList className="h-auto">
            <TabsTrigger value="all" className="font-mono text-xs gap-1.5">
              All ({messages.length})
            </TabsTrigger>
            <TabsTrigger value="email" className="font-mono text-xs gap-1.5">
              <RiMailSendLine className="size-3.5" />
              Emails ({messages.filter((m) => m.channel === "email").length})
            </TabsTrigger>
            <TabsTrigger value="sms" className="font-mono text-xs gap-1.5">
              <RiSmartphoneLine className="size-3.5" />
              SMS ({messages.filter((m) => m.channel === "sms").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="outbox-auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label
              htmlFor="outbox-auto-refresh"
              className="font-mono text-xs text-muted-foreground cursor-pointer"
            >
              Auto-refresh (4s)
            </Label>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
            className="font-mono text-xs gap-1.5"
          >
            {loading ? (
              <RiLoader4Line className="size-3.5 animate-spin" />
            ) : (
              <RiRefreshLine className="size-3.5" />
            )}
            Refresh
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={loading || messages.length === 0}
            className="font-mono text-xs gap-1.5 text-destructive hover:text-destructive"
          >
            <RiDeleteBinLine className="size-3.5" />
            Clear
          </Button>
        </div>
      </div>

      {visibleMessages.length === 0 ? (
        <Card className="border border-border/50 bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <RiInboxLine className="size-10 text-muted-foreground/60 mb-3" />
            <h2 className="font-heading text-base font-semibold">
              No console messages yet
            </h2>
            <p className="mt-1 max-w-md font-mono text-xs text-muted-foreground">
              When Mail Provider or SMS Provider is set to{" "}
              <code className="rounded bg-muted px-1 py-0.5">console</code>,
              dispatched Magic Links and 6-digit OTPs appear here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleMessages.map((msg) => (
            <Card key={msg.id} className="border border-border/50 bg-card">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={msg.channel === "sms" ? "secondary" : "default"}
                      className="font-mono text-[10px] gap-1"
                    >
                      {msg.channel === "sms" ? (
                        <RiSmartphoneLine className="size-3" />
                      ) : (
                        <RiMailSendLine className="size-3" />
                      )}
                      {msg.channel.toUpperCase()}
                    </Badge>
                    <CardTitle className="font-mono text-sm font-semibold">
                      {msg.to}
                    </CardTitle>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {new Date(msg.createdAt).toLocaleString()}
                  </span>
                </div>
                {msg.subject && (
                  <CardDescription className="font-mono text-xs pt-1 text-foreground/90">
                    {msg.subject}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Quick Action Bar for Extracted OTP Code or Magic Link */}
                {(msg.extractedCode || msg.extractedLinks.length > 0) && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                    {msg.extractedCode && (
                      <div className="flex items-center gap-2 mr-auto">
                        <RiKey2Line className="size-4 text-primary" />
                        <span className="font-mono text-xs text-muted-foreground">
                          OTP Code:
                        </span>
                        <span className="rounded bg-background px-2.5 py-1 font-mono text-base font-bold tracking-[0.25em] text-foreground border border-border">
                          {msg.extractedCode}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            copyText(`code-${msg.id}`, msg.extractedCode!)
                          }
                          className="h-7 font-mono text-xs gap-1"
                        >
                          {copiedId === `code-${msg.id}` ? (
                            <>
                              <RiCheckLine className="size-3.5 text-emerald-500" />
                              Copied
                            </>
                          ) : (
                            <>
                              <RiFileCopyLine className="size-3.5" />
                              Copy Code
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {msg.extractedLinks.map((link, idx) => (
                      <div
                        key={link}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 font-mono text-xs gap-1.5"
                          >
                            <RiExternalLinkLine className="size-3.5" />
                            Open Link{msg.extractedLinks.length > 1 ? ` #${idx + 1}` : ""}
                          </Button>
                        </a>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => copyText(`link-${msg.id}-${idx}`, link)}
                          className="h-7 font-mono text-xs gap-1"
                        >
                          {copiedId === `link-${msg.id}-${idx}` ? (
                            <>
                              <RiCheckLine className="size-3.5 text-emerald-500" />
                              Copied
                            </>
                          ) : (
                            <>
                              <RiFileCopyLine className="size-3.5" />
                              Copy Link
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <pre className="whitespace-pre-wrap break-all rounded-md border border-border/40 bg-muted/30 p-3 font-mono text-xs text-muted-foreground">
                  {msg.body}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
