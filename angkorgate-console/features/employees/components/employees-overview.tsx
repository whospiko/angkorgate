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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  RiUserLine,
  RiCommunityLine,
  RiSuitcaseLine,
  RiMoreLine,
  RiEyeLine,
  RiEditLine,
  RiDeleteBinLine,
  RiSearchLine,
  RiCloseLine,
  RiUserFollowLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
} from "@remixicon/react"
import type {
  Department,
  DepartmentTreeNode,
  OrgChartNode,
  JobTitle,
  Employee,
  LeaveRequest,
} from "../types/employees.types"
import { deleteEmployeeAction } from "../server/employees-actions"
import { CreateEmployeeDialog } from "./create-employee-dialog"
import { EditEmployeeDialog } from "./edit-employee-dialog"
import { EmployeeDetailsDialog } from "./employee-details-dialog"
import { DepartmentsManager } from "./departments-manager"
import { JobTitlesManager } from "./job-titles-manager"
import { OrgChartView } from "./org-chart-view"
import { LeaveQueueManager } from "./leave-queue-manager"

interface EmployeesOverviewProps {
  departments: Department[]
  departmentTree?: DepartmentTreeNode[]
  orgChart?: OrgChartNode[]
  leaveRequests?: LeaveRequest[]
  jobTitles: JobTitle[]
  employees: Employee[]
  total?: number
  page?: number
  limit?: number
  initialSearch?: string
  initialStatus?: string
  initialDepartment?: string
  initialJobTitle?: string
}

export function EmployeesOverview({
  departments,
  departmentTree = [],
  orgChart = [],
  leaveRequests = [],
  jobTitles,
  employees,
  total = employees.length,
  page = 1,
  limit = 20,
  initialSearch = "",
  initialStatus = "",
  initialDepartment = "",
  initialJobTitle = "",
}: EmployeesOverviewProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [selectedViewEmployee, setSelectedViewEmployee] = useState<Employee | null>(null)
  const [selectedEditEmployee, setSelectedEditEmployee] = useState<Employee | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [searchText, setSearchText] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [deptFilter, setDeptFilter] = useState(initialDepartment)
  const [jtFilter, setJtFilter] = useState(initialJobTitle)

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const pushFilters = (next: {
    search?: string
    status?: string
    departmentCode?: string
    jobTitleCode?: string
    page?: number
  }) => {
    const params = new URLSearchParams()
    const s = next.search !== undefined ? next.search : searchText
    const st = next.status !== undefined ? next.status : statusFilter
    const d = next.departmentCode !== undefined ? next.departmentCode : deptFilter
    const j = next.jobTitleCode !== undefined ? next.jobTitleCode : jtFilter
    const p = next.page !== undefined ? next.page : 1

    if (s.trim()) params.set("search", s.trim())
    if (st) params.set("status", st)
    if (d) params.set("departmentCode", d)
    if (j) params.set("jobTitleCode", j)
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
    setStatusFilter("")
    setDeptFilter("")
    setJtFilter("")
    router.push(pathname)
  }

  const handleDelete = async (emp: Employee) => {
    if (
      !confirm(
        `Are you sure you want to delete employee "${emp.fullName}" (${emp.employeeCode})?`
      )
    )
      return
    setDeletingId(emp.id)
    setActionError(null)
    try {
      const res = await deleteEmployeeAction(emp.id)
      if (!res.success) {
        setActionError(res.message || "Failed to delete employee")
      }
    } finally {
      setDeletingId(null)
    }
  }

  const hasActiveFilters = Boolean(
    initialSearch || initialStatus || initialDepartment || initialJobTitle
  )

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Total Staff
            </CardTitle>
            <RiUserLine className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-heading text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              Registered personnel in system
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Departments
            </CardTitle>
            <RiCommunityLine className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-heading text-2xl font-bold">{departments.length}</div>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              Active operational units
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Job Titles
            </CardTitle>
            <RiSuitcaseLine className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-heading text-2xl font-bold">{jobTitles.length}</div>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              Defined staff roles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="staff" className="space-y-4">
        <TabsList className="font-mono text-xs">
          <TabsTrigger value="staff">Staff Directory ({total})</TabsTrigger>
          <TabsTrigger value="org-chart">Org Chart</TabsTrigger>
          <TabsTrigger value="leaves">Leave Queue ({leaveRequests.filter((l) => l.status === "PENDING").length})</TabsTrigger>
          <TabsTrigger value="departments">Departments ({departments.length})</TabsTrigger>
          <TabsTrigger value="job-titles">Job Titles ({jobTitles.length})</TabsTrigger>
        </TabsList>

        {/* Tab 1: Staff Directory */}
        <TabsContent value="staff" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading text-base font-semibold">Staff Directory</h3>
              <p className="font-mono text-xs text-muted-foreground">
                Manage employee assignments, shift schedules, and status.
              </p>
            </div>
            <CreateEmployeeDialog employees={employees} />
          </div>

          {/* Search & Filters Toolbar */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border/50 bg-card p-3"
          >
            <div className="flex flex-1 flex-wrap items-center gap-2 font-mono text-xs">
              <div className="relative flex-1 min-w-[200px]">
                <RiSearchLine className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, EMP code, phone..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-8 h-8 text-xs font-mono"
                />
              </div>

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
                <option value="ON_LEAVE">ON_LEAVE</option>
                <option value="RESIGNED">RESIGNED</option>
                <option value="TERMINATED">TERMINATED</option>
              </select>

              <select
                value={deptFilter}
                onChange={(e) => {
                  const val = e.target.value
                  setDeptFilter(val)
                  pushFilters({ departmentCode: val, page: 1 })
                }}
                className="h-8 rounded-md border border-input bg-background/90 dark:bg-black/25 px-2.5 text-xs font-mono text-foreground focus-visible:border-primary outline-none"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                value={jtFilter}
                onChange={(e) => {
                  const val = e.target.value
                  setJtFilter(val)
                  pushFilters({ jobTitleCode: val, page: 1 })
                }}
                className="h-8 rounded-md border border-input bg-background/90 dark:bg-black/25 px-2.5 text-xs font-mono text-foreground focus-visible:border-primary outline-none"
              >
                <option value="">All Job Titles</option>
                {jobTitles.map((jt) => (
                  <option key={jt.code} value={jt.code}>
                    {jt.name}
                  </option>
                ))}
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
          </form>

          {actionError && (
            <div className="font-mono text-xs text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/20">
              {actionError}
            </div>
          )}

          {employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-12 text-center bg-card">
              <RiUserLine className="size-10 text-muted-foreground/60 mb-3" />
              <h3 className="font-heading text-base font-semibold">No Employees Found</h3>
              <p className="font-mono text-xs text-muted-foreground max-w-sm mt-1">
                {hasActiveFilters
                  ? "No staff matched your current filters."
                  : 'No staff profiles found. Click "Add Employee" above to register your first staff member.'}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-mono text-xs">Employee</TableHead>
                    <TableHead className="font-mono text-xs">Position / Dept</TableHead>
                    <TableHead className="font-mono text-xs">Status</TableHead>
                    <TableHead className="font-mono text-xs">Contact</TableHead>
                    <TableHead className="font-mono text-xs">Account</TableHead>
                    <TableHead className="font-mono text-xs">Hired</TableHead>
                    <TableHead className="font-mono text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => {
                    const primaryPos =
                      emp.positions?.find((p) => p.isPrimary) || emp.positions?.[0]
                    return (
                      <TableRow key={emp.id} className="font-mono text-xs">
                        <TableCell className="font-medium text-foreground">
                          <div className="font-sans text-sm font-semibold">{emp.fullName}</div>
                          <div className="text-[11px] text-primary font-bold font-mono">
                            {emp.employeeCode}
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px]">
                          {primaryPos ? (
                            <div className="space-y-0.5">
                              <div className="font-medium text-foreground">
                                {primaryPos.jobTitle?.name || primaryPos.jobTitle?.code || "Role"}
                              </div>
                              {primaryPos.department && (
                                <Badge variant="outline" className="font-mono text-[10px]">
                                  {primaryPos.department.name}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`font-mono text-[10px] uppercase ${
                              emp.employmentStatus === "ACTIVE"
                                ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                                : emp.employmentStatus === "ON_LEAVE"
                                ? "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            {emp.employmentStatus || "ACTIVE"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-[11px]">
                          <div>{emp.phone || "No phone"}</div>
                          <div className="truncate max-w-[150px]">{emp.address || "—"}</div>
                        </TableCell>
                        <TableCell className="text-[11px]">
                          {emp.userId ? (
                            <Link
                              href={`/users/${emp.userId}`}
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              <RiUserFollowLine className="size-3.5" />
                              Linked
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">Unlinked</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-[11px]">
                          {emp.hireDate ? emp.hireDate.split("T")[0] : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  disabled={deletingId === emp.id}
                                >
                                  <RiMoreLine className="size-4" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedViewEmployee(emp)}>
                                <RiEyeLine className="size-4" /> View Details & Schedules
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSelectedEditEmployee(emp)}>
                                <RiEditLine className="size-4" /> Edit Profile
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => handleDelete(emp)}
                              >
                                <RiDeleteBinLine className="size-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
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
        </TabsContent>

        {/* Tab 2: Org Chart */}
        <TabsContent value="org-chart">
          <OrgChartView orgChart={orgChart} departmentTree={departmentTree} />
        </TabsContent>

        {/* Tab 3: Leave Queue */}
        <TabsContent value="leaves">
          <LeaveQueueManager leaveRequests={leaveRequests} />
        </TabsContent>

        {/* Tab 4: Departments */}
        <TabsContent value="departments">
          <DepartmentsManager departments={departments} />
        </TabsContent>

        {/* Tab 3: Job Titles */}
        <TabsContent value="job-titles">
          <JobTitlesManager jobTitles={jobTitles} />
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      {selectedViewEmployee && (
        <EmployeeDetailsDialog
          key={selectedViewEmployee.id}
          employee={selectedViewEmployee}
          departments={departments}
          jobTitles={jobTitles}
          open={Boolean(selectedViewEmployee)}
          onOpenChange={(open) => !open && setSelectedViewEmployee(null)}
        />
      )}

      {/* Edit Dialog */}
      {selectedEditEmployee && (
        <EditEmployeeDialog
          key={selectedEditEmployee.id}
          employee={selectedEditEmployee}
          employees={employees}
          open={Boolean(selectedEditEmployee)}
          onOpenChange={(open) => !open && setSelectedEditEmployee(null)}
        />
      )}
    </div>
  )
}
