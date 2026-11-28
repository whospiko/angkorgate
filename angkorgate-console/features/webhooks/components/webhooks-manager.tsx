"use client"

import { useState } from "react"
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
  RiAddLine,
  RiDeleteBinLine,
  RiEyeLine,
  RiLoader4Line,
  RiRefreshLine,
  RiSendPlaneLine,
  RiWebhookLine,
} from "@remixicon/react"
import type { WebhookDelivery, WebhookEndpoint } from "../types/webhooks.types"
import {
  createWebhookEndpointAction,
  deleteWebhookEndpointAction,
  getWebhookDeliveriesAction,
  retryWebhookDeliveryAction,
  testWebhookEndpointAction,
  toggleWebhookEndpointAction,
} from "../server/webhooks-actions"

const AVAILABLE_EVENTS = [
  { id: "customer.created", label: "customer.created (ERP / Clinic Patient)" },
  { id: "employee.onboarded", label: "employee.onboarded (HR Staff)" },
  { id: "leave.approved", label: "leave.approved (HR Leave)" },
]

export function WebhooksManager({
  initialEndpoints,
}: {
  initialEndpoints: WebhookEndpoint[]
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [secret, setSecret] = useState("")
  const [events, setEvents] = useState<string[]>([
    "customer.created",
    "employee.onboarded",
    "leave.approved",
  ])
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [selectedEndpoint, setSelectedEndpoint] = useState<WebhookEndpoint | null>(null)
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  )

  const toggleEvent = (ev: string) => {
    setEvents((prev) =>
      prev.includes(ev) ? prev.filter((item) => item !== ev) : [...prev, ev]
    )
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !url.trim() || events.length === 0) {
      setFeedback({ type: "error", message: "Name, URL, and at least one event are required." })
      return
    }
    setCreating(true)
    setFeedback(null)
    const res = await createWebhookEndpointAction({
      name: name.trim(),
      url: url.trim(),
      events,
      secret: secret.trim() || undefined,
    })
    setCreating(false)
    if (res.success && res.data) {
      setName("")
      setUrl("")
      setSecret("")
      setFeedback({
        type: "success",
        message: `Webhook "${res.data.name}" created. Signing secret: ${res.data.secret}`,
      })
      router.refresh()
    } else {
      setFeedback({ type: "error", message: res.message || "Failed to create webhook" })
    }
  }

  const loadDeliveries = async (ep: WebhookEndpoint) => {
    setSelectedEndpoint(ep)
    const list = await getWebhookDeliveriesAction(ep.id)
    setDeliveries(list)
  }

  const handleTest = async (ep: WebhookEndpoint) => {
    setBusyId(ep.id)
    setFeedback(null)
    const res = await testWebhookEndpointAction(ep.id)
    setBusyId(null)
    if (res.success && res.data) {
      setFeedback({
        type: res.data.status === "DELIVERED" ? "success" : "error",
        message: `Test delivery ${res.data.status} (HTTP ${res.data.statusCode ?? "network error"})`,
      })
      await loadDeliveries(ep)
    } else {
      setFeedback({ type: "error", message: res.message || "Test delivery failed" })
    }
  }

  const handleRetry = async (deliveryId: string) => {
    setBusyId(deliveryId)
    const res = await retryWebhookDeliveryAction(deliveryId)
    setBusyId(null)
    if (res.success && selectedEndpoint) {
      await loadDeliveries(selectedEndpoint)
    }
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`font-mono text-xs p-3 rounded-md border ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Register Webhook Endpoint */}
      <Card className="border border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <RiWebhookLine className="size-4 text-primary" />
            Register Webhook Endpoint
          </CardTitle>
          <CardDescription className="font-mono text-xs">
            Receive HMAC-SHA256 signed JSON events (`X-AngkorGate-Signature`) when HR/ERP records change.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-12 gap-3 font-mono text-xs">
            <div className="sm:col-span-4 space-y-1">
              <Label htmlFor="wh-name">Endpoint Name *</Label>
              <Input
                id="wh-name"
                placeholder="e.g. Clinic HIS Sync"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-5 space-y-1">
              <Label htmlFor="wh-url">Target URL *</Label>
              <Input
                id="wh-url"
                placeholder="https://his.example.com/webhooks/angkorgate"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-3 space-y-1">
              <Label htmlFor="wh-secret">Secret (optional)</Label>
              <Input
                id="wh-secret"
                placeholder="Auto-generated if empty"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
              />
            </div>

            <div className="sm:col-span-9 flex flex-wrap items-center gap-4 pt-1">
              {AVAILABLE_EVENTS.map((ev) => (
                <label key={ev.id} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={events.includes(ev.id)}
                    onChange={() => toggleEvent(ev.id)}
                  />
                  <span>{ev.label}</span>
                </label>
              ))}
            </div>

            <div className="sm:col-span-3 flex justify-end">
              <Button type="submit" size="sm" disabled={creating} className="font-mono text-xs">
                {creating ? (
                  <RiLoader4Line className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <RiAddLine className="mr-1.5 size-4" />
                )}
                Add Endpoint
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Endpoints Table */}
      <Card className="border border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="font-heading text-base">
            Configured Endpoints ({initialEndpoints.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {initialEndpoints.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground">
              No webhook endpoints configured yet.
            </p>
          ) : (
            <div className="rounded-md border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-mono text-xs">Name & URL</TableHead>
                    <TableHead className="font-mono text-xs">Subscribed Events</TableHead>
                    <TableHead className="font-mono text-xs">Status</TableHead>
                    <TableHead className="font-mono text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialEndpoints.map((ep) => (
                    <TableRow key={ep.id} className="font-mono text-xs">
                      <TableCell>
                        <div className="font-sans text-sm font-medium">{ep.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                          {ep.url}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {ep.events.map((ev) => (
                            <Badge key={ev} variant="secondary" className="text-[10px]">
                              {ev}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={async () => {
                            await toggleWebhookEndpointAction(ep.id, !ep.isActive)
                            router.refresh()
                          }}
                          className="cursor-pointer"
                        >
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              ep.isActive
                                ? "border-emerald-500/40 text-emerald-500"
                                : "text-muted-foreground"
                            }`}
                          >
                            {ep.isActive ? "ACTIVE" : "PAUSED"}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === ep.id}
                            onClick={() => void handleTest(ep)}
                            className="h-7 px-2 font-mono text-[11px]"
                          >
                            <RiSendPlaneLine className="mr-1 size-3" /> Test
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void loadDeliveries(ep)}
                            className="h-7 px-2 font-mono text-[11px]"
                          >
                            <RiEyeLine className="mr-1 size-3" /> Outbox
                          </Button>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={async () => {
                              await deleteWebhookEndpointAction(ep.id)
                              if (selectedEndpoint?.id === ep.id) setSelectedEndpoint(null)
                              router.refresh()
                            }}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <RiDeleteBinLine className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Outbox */}
      {selectedEndpoint && (
        <Card className="border border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="font-heading text-base">
              Outbox Deliveries — {selectedEndpoint.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deliveries.length === 0 ? (
              <p className="font-mono text-xs text-muted-foreground">
                No delivery attempts recorded for this endpoint yet.
              </p>
            ) : (
              <div className="rounded-md border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-mono text-xs">Event</TableHead>
                      <TableHead className="font-mono text-xs">Status</TableHead>
                      <TableHead className="font-mono text-xs">HTTP / Response</TableHead>
                      <TableHead className="font-mono text-xs">Attempts</TableHead>
                      <TableHead className="font-mono text-xs text-right">Retry</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveries.map((del) => (
                      <TableRow key={del.id} className="font-mono text-xs">
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {del.event}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              del.status === "DELIVERED"
                                ? "border-emerald-500/40 text-emerald-500"
                                : del.status === "FAILED"
                                ? "border-rose-500/40 text-rose-500"
                                : "text-amber-500"
                            }`}
                          >
                            {del.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {del.statusCode ? `HTTP ${del.statusCode}` : "No response"}
                          {del.responseBody ? ` · ${del.responseBody}` : ""}
                        </TableCell>
                        <TableCell>{del.attempts}</TableCell>
                        <TableCell className="text-right">
                          {del.status === "FAILED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === del.id}
                              onClick={() => void handleRetry(del.id)}
                              className="h-7 px-2 font-mono text-[11px]"
                            >
                              <RiRefreshLine className="mr-1 size-3" /> Retry
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
