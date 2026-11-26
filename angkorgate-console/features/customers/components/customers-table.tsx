"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
import { Input } from "@/components/ui/input"
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
  RiSearchLine,
  RiUserFollowLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCloseLine,
} from "@remixicon/react"
import type { Customer } from "../types/customers.types"
import { deleteCustomerAction } from "../server/customers-actions"
import { CustomerDetailsDialog } from "./customer-details-dialog"
import { EditCustomerDialog } from "./edit-customer-dialog"

interface CustomersTableProps {
  customers: Customer[]
  total?: number
  page?: number
  limit?: number
  initialSearch?: string
  initialType?: string
  initialStatus?: string
}

export function CustomersTable({
  customers,
  total = customers.length,
  page = 1,
  limit = 20,
  initialSearch = "",
  initialType = "",
  initialStatus = "",
}: CustomersTableProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [selectedViewCustomer, setSelectedViewCustomer] = useState<Customer | null>(null)
  const [selectedEditCustomer, setSelectedEditCustomer] = useState<Customer | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [searchText, setSearchText] = useState(initialSearch)
  const [typeFilter, setTypeFilter] = useState(initialType)
  const [statusFilter, setStatusFilter] = useState(initialStatus)

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const pushFilters = (next: {
    search?: string
    type?: string
    status?: string
    page?: number
  }) => {
    const params = new URLSearchParams()
    const s = next.search !== undefined ? next.search : searchText
    const t = next.type !== undefined ? next.type : typeFilter
    const st = next.status !== undefined ? next.status : statusFilter
    const p = next.page !== undefined ? next.page : 1

    if (s.trim()) params.set("search", s.trim())
    if (t) params.set("type", t)
    if (st) params.set("status", st)
    if (p > 1) params.set("page", String(p))

    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    pushFilters({ search: searchText, page: 1 })
  }

  const handleResetFilters = () => {
    setSearchText("")
    setTypeFilter("")
    setStatusFilter("")
    router.push(pathname)
  }

  const handleDelete = async (customer: Customer) => {
    if (
      !confirm(
        `Are you sure you want to delete customer "${customer.fullName}" (${customer.customerCode})?`
      )
    )
      return
    setDeletingId(customer.id)
    setActionError(null)
    try {
      const res = await deleteCustomerAction(customer.id)
      if (!res.success) {
        setActionError(res.message || "Failed to delete customer")
      }
    } finally {
      setDeletingId(null)
    }
  }

  const hasActiveFilters = Boolean(initialSearch || initialType || initialStatus)

  return (
    <div className="space-y-4">
      {/* Filter & Search Toolbar */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border/50 bg-card p-3"
      >
        <div className="flex flex-1 flex-wrap items-center gap-2 font-mono text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <RiSearchLine className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search name, code (PAT-0001), phone, email..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-8 h-8 text-xs font-mono"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              const val = e.target.value
              setTypeFilter(val)
              pushFilters({ type: val, page: 1 })
            }}
            className="h-8 rounded-md border border-input bg-background/90 dark:bg-black/25 px-2.5 text-xs font-mono text-foreground focus-visible:border-primary outline-none"
          >
            <option value="">All Types</option>
            <option value="CUSTOMER">CUSTOMER</option>
            <option value="PATIENT">PATIENT</option>
            <option value="GUEST">GUEST</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              const val = e.target.value
              setStatusFilter(val)
              pushFilters({ status: val, page: 1 })
            }}
            className="h-8 rounded-md border border-input bg-background/90 dark:bg-black/25 px-2.5 text-xs font-mono text-foreground focus-visible:border-primary outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>

          <Button type="submit" size="sm" variant="secondary" className="h-8 font-mono text-xs">
            Search
          </Button>

          {hasActiveFilters && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleResetFilters}
              className="h-8 font-mono text-xs text-muted-foreground"
            >
              <RiCloseLine className="mr-1 size-3.5" />
              Clear
            </Button>
          )}
        </div>

        <div className="font-mono text-[11px] text-muted-foreground shrink-0">
          Total: <span className="font-semibold text-foreground">{total}</span>
        </div>
      </form>

      {actionError && (
        <div className="font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/20">
          {actionError}
        </div>
      )}

      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-12 text-center bg-card">
          <RiBuilding4Line className="size-10 text-muted-foreground/60 mb-3" />
          <h3 className="font-heading text-base font-semibold">No Customers Found</h3>
          <p className="font-mono text-xs text-muted-foreground max-w-sm mt-1">
            {hasActiveFilters
              ? "No customer profiles matched your current filters. Try clearing filters."
              : 'No customer profiles registered yet. Click "Add Customer" above to register your first customer.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-mono text-xs">Customer</TableHead>
                <TableHead className="font-mono text-xs">Type</TableHead>
                <TableHead className="font-mono text-xs">Status</TableHead>
                <TableHead className="font-mono text-xs">Phone / Email</TableHead>
                <TableHead className="font-mono text-xs">Gender / DOB</TableHead>
                <TableHead className="font-mono text-xs">Account</TableHead>
                <TableHead className="font-mono text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id} className="font-mono text-xs">
                  <TableCell className="font-medium text-foreground font-sans text-sm">
                    <div className="flex items-center gap-1.5">
                      <span>{c.fullName}</span>
                      {c.isMinor && (
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                        >
                          Minor
                        </Badge>
                      )}
                    </div>
                    <div className="font-mono text-[11px] text-primary font-semibold">
                      {c.customerCode || c.id.slice(0, 8)}
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
                          : c.status === "INACTIVE"
                          ? "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {c.status || "ACTIVE"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[11px]">
                    <div>{c.phone || "No phone"}</div>
                    <div className="truncate max-w-[170px]">{c.email || "—"}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[11px]">
                    <div>{c.gender || "Unspecified"}</div>
                    <div>{c.dateOfBirth ? c.dateOfBirth.split("T")[0] : "—"}</div>
                  </TableCell>
                  <TableCell className="text-[11px]">
                    {c.userId ? (
                      <Link
                        href={`/users/${c.userId}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <RiUserFollowLine className="size-3.5" />
                        Linked
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Walk-in</span>
                    )}
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
                          <RiEyeLine className="size-4" /> View Details & Contacts
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/50 px-4 py-2.5 font-mono text-xs text-muted-foreground">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => pushFilters({ page: page - 1 })}
                  className="h-7 px-2 font-mono text-xs"
                >
                  <RiArrowLeftSLine className="size-4" /> Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => pushFilters({ page: page + 1 })}
                  className="h-7 px-2 font-mono text-xs"
                >
                  Next <RiArrowRightSLine className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

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
    </div>
  )
}
