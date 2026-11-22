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
import { RiBuilding4Line } from "@remixicon/react"
import type { Customer } from "../types/customers.types"

interface CustomersTableProps {
  customers: Customer[]
}

export function CustomersTable({ customers }: CustomersTableProps) {
  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-12 text-center bg-card">
        <RiBuilding4Line className="size-10 text-muted-foreground/60 mb-3" />
        <h3 className="font-heading text-base font-semibold">No Customers Found</h3>
        <p className="font-mono text-xs text-muted-foreground max-w-sm mt-1">
          Customer profiles registered in the CRM module will be listed here.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="font-mono text-xs">Customer Name</TableHead>
            <TableHead className="font-mono text-xs">Status</TableHead>
            <TableHead className="font-mono text-xs">Contact Info</TableHead>
            <TableHead className="font-mono text-xs">Customer ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((c) => (
            <TableRow key={c.id} className="font-mono text-xs">
              <TableCell className="font-medium text-foreground font-sans text-sm">
                {c.name}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono text-[10px] uppercase">
                  {c.status || "ACTIVE"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-[11px]">
                {c.email || c.phone || "No contact info"}
              </TableCell>
              <TableCell className="text-muted-foreground text-[11px] truncate max-w-[200px]">
                {c.id}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
