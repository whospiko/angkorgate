import {
  getDepartments,
  getJobTitles,
  getEmployees,
  EmployeesOverview,
} from "@/features/employees"

export const metadata = {
  title: "Organization & Staff | AngkorGate",
}

export default async function EmployeesPage() {
  const [departments, jobTitles, employees] = await Promise.all([
    getDepartments(),
    getJobTitles(),
    getEmployees(),
  ])

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Organization & Staff
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            Internal departments, job titles, positions, and staff schedules.
          </p>
        </div>
      </div>

      <EmployeesOverview
        departments={departments}
        jobTitles={jobTitles}
        employees={employees}
      />
    </div>
  )
}
