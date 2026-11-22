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
} from "@remixicon/react"
import type { Department, JobTitle, Employee } from "../types/employees.types"
import { deleteEmployeeAction } from "../server/employees-actions"
import { CreateEmployeeDialog } from "./create-employee-dialog"
import { EditEmployeeDialog } from "./edit-employee-dialog"
import { EmployeeDetailsDialog } from "./employee-details-dialog"
import { DepartmentsManager } from "./departments-manager"
import { JobTitlesManager } from "./job-titles-manager"

interface EmployeesOverviewProps {
  departments: Department[]
  jobTitles: JobTitle[]
  employees: Employee[]
}

export function EmployeesOverview({
  departments,
  jobTitles,
  employees,
}: EmployeesOverviewProps) {
  const [selectedViewEmployee, setSelectedViewEmployee] = useState<Employee | null>(null)
  const [selectedEditEmployee, setSelectedEditEmployee] = useState<Employee | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Are you sure you want to delete employee "${emp.fullName}" (${emp.employeeCode})?`)) return
    setDeletingId(emp.id)
    try {
      await deleteEmployeeAction(emp.id)
    } finally {
      setDeletingId(null)
    }
  }

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
            <div className="font-heading text-2xl font-bold">{employees.length}</div>
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
          <TabsTrigger value="staff">Staff Directory ({employees.length})</TabsTrigger>
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
            <CreateEmployeeDialog />
          </div>

          {employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 p-12 text-center bg-card">
              <RiUserLine className="size-10 text-muted-foreground/60 mb-3" />
              <h3 className="font-heading text-base font-semibold">No Employees Registered</h3>
              <p className="font-mono text-xs text-muted-foreground max-w-sm mt-1">
                No staff profiles found. Click &quot;Add Employee&quot; above to register your first staff member.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-mono text-xs">Employee</TableHead>
                    <TableHead className="font-mono text-xs">Status</TableHead>
                    <TableHead className="font-mono text-xs">Contact</TableHead>
                    <TableHead className="font-mono text-xs">Hired</TableHead>
                    <TableHead className="font-mono text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id} className="font-mono text-xs">
                      <TableCell className="font-medium text-foreground">
                        <div className="font-sans text-sm font-semibold">{emp.fullName}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Code: <span className="font-bold text-primary">{emp.employeeCode}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`font-mono text-[10px] uppercase ${
                            emp.status === "ACTIVE"
                              ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                              : emp.status === "PROBATION"
                              ? "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {emp.status || "ACTIVE"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[11px]">
                        <div>{emp.phone || "No phone"}</div>
                        <div className="truncate max-w-[150px]">{emp.address || ""}</div>
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Departments */}
        <TabsContent value="departments">
          <DepartmentsManager departments={departments} />
        </TabsContent>

        {/* Tab 3: Job Titles */}
        <TabsContent value="job-titles">
          <JobTitlesManager jobTitles={jobTitles} departments={departments} />
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      {selectedViewEmployee && (
        <EmployeeDetailsDialog
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
          employee={selectedEditEmployee}
          open={Boolean(selectedEditEmployee)}
          onOpenChange={(open) => !open && setSelectedEditEmployee(null)}
        />
      )}
    </div>
  )
}
