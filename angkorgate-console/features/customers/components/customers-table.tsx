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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  RiBuilding4Line,
  RiMoreLine,
  RiEyeLine,
  RiEditLine,
  RiDeleteBinLine,
} from "@remixicon/react"
import type { Customer } from "../types/customers.types"
import { deleteCustomerAction } from "../server/customers-actions"
import { CustomerDetailsDialog } from "./customer-details-dialog"
import { EditCustomerDialog } from "./edit-customer-dialog"

interface CustomersTableProps {
  customers: Customer[]
}

export function CustomersTable({ customers }: CustomersTableProps) {
  const [selectedViewCustomer, setSelectedViewCustomer] = useState<Customer | null>(null)
  const [selectedEditCustomer, setSelectedEditCustomer] = useState<Customer | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete customer "${customer.fullName}"?`)) return
    setDeletingId(customer.id)
    try {
      await deleteCustomerAction(customer.id)
    } finally {
      setDeletingId(null)
    }
  }

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-12 text-center bg-card">
        <RiBuilding4Line className="size-10 text-muted-foreground/60 mb-3" />
        <h3 className="font-heading text-base font-semibold">No Customers Found</h3>
        <p className="font-mono text-xs text-muted-foreground max-w-sm mt-1">
          No customer profiles registered yet. Click &quot;Add Customer&quot; above to register your first customer.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-mono text-xs">Customer Name</TableHead>
              <TableHead className="font-mono text-xs">Type</TableHead>
              <TableHead className="font-mono text-xs">Status</TableHead>
              <TableHead className="font-mono text-xs">Phone / Email</TableHead>
              <TableHead className="font-mono text-xs">Gender / DOB</TableHead>
              <TableHead className="font-mono text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.id} className="font-mono text-xs">
                <TableCell className="font-medium text-foreground font-sans text-sm">
                  <div>{c.fullName}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    Code: {c.code || c.id.slice(0, 8)}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-mono text-[10px] uppercase">
                    {c.type || "CUSTOMER"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`font-mono text-[10px] uppercase ${
                      c.status === "ACTIVE"
                        ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                        : c.status === "LEAD"
                        ? "border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {c.status || "ACTIVE"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-[11px]">
                  <div>{c.phone || "No phone"}</div>
                  <div className="truncate max-w-[150px]">{c.email || ""}</div>
                </TableCell>
                <TableCell className="text-muted-foreground text-[11px]">
                  <div>{c.gender || "Unspecified"}</div>
                  <div>{c.dateOfBirth ? c.dateOfBirth.split("T")[0] : ""}</div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          disabled={deletingId === c.id}
                        >
                          <RiMoreLine className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedViewCustomer(c)}>
                        <RiEyeLine className="size-4" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSelectedEditCustomer(c)}>
                        <RiEditLine className="size-4" /> Edit Profile
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => handleDelete(c)}
                      >
                        <RiDeleteBinLine className="size-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedViewCustomer && (
        <CustomerDetailsDialog
          customer={selectedViewCustomer}
          open={Boolean(selectedViewCustomer)}
          onOpenChange={(open) => !open && setSelectedViewCustomer(null)}
        />
      )}

      {selectedEditCustomer && (
        <EditCustomerDialog
          customer={selectedEditCustomer}
          open={Boolean(selectedEditCustomer)}
          onOpenChange={(open) => !open && setSelectedEditCustomer(null)}
        />
      )}
    </>
  )
}
