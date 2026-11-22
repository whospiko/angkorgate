"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { RiFileList3Line } from "@remixicon/react"
import type { AuditLog } from "../types/audit.types"

interface AuditLogsTableProps {
  logs: AuditLog[]
}

export function AuditLogsTable({ logs }: AuditLogsTableProps) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-12 text-center bg-card">
        <RiFileList3Line className="size-10 text-muted-foreground/60 mb-3" />
        <h3 className="font-heading text-base font-semibold">No Audit Logs Recorded</h3>
        <p className="font-mono text-xs text-muted-foreground max-w-sm mt-1">
          System events, user logins, and administrative changes will appear here in real time.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="font-mono text-xs">Timestamp</TableHead>
            <TableHead className="font-mono text-xs">Action</TableHead>
            <TableHead className="font-mono text-xs">Entity</TableHead>
            <TableHead className="font-mono text-xs">Actor / IP</TableHead>
            <TableHead className="font-mono text-xs">Entity ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id} className="font-mono text-xs">
              <TableCell className="text-muted-foreground whitespace-nowrap text-[11px]">
                {log.createdAt ? new Date(log.createdAt).toLocaleString() : "Just now"}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono text-[10px] uppercase">
                  {log.action}
                </Badge>
              </TableCell>
              <TableCell className="font-medium text-foreground capitalize">
                {log.entity}
              </TableCell>
              <TableCell>
                <div className="text-foreground">{log.actorEmail || log.userId || "System"}</div>
                {log.ipAddress && (
                  <div className="text-[10px] text-muted-foreground">{log.ipAddress}</div>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-[11px] truncate max-w-[180px]">
                {log.entityId || "N/A"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
