import {
  getDepartments,
  getDepartmentTree,
  getOrgChart,
  getJobTitles,
  getEmployees,
  EmployeesOverview,
} from "@/features/employees"

export const metadata = {
  title: "Organization & Staff | AngkorGate",
}

interface EmployeesPageProps {
  searchParams?: Promise<{
    search?: string
    status?: string
    departmentCode?: string
    jobTitleCode?: string
    page?: string
  }>
}

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const params = (await searchParams) || {}
  const page = params.page ? Math.max(1, parseInt(params.page, 10) || 1) : 1

  const [departments, departmentTree, orgChart, jobTitles, employeesData] = await Promise.all([
    getDepartments(),
    getDepartmentTree(),
    getOrgChart(),
    getJobTitles(),
    getEmployees({
      search: params.search,
      status: params.status,
      departmentCode: params.departmentCode,
      jobTitleCode: params.jobTitleCode,
      page,
      limit: 20,
    }),
  ])

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Organization & Staff
          </h1>
          <p className="text-xs text-muted-foreground">
            Internal departments, job titles, reporting lines, positions, and staff schedules.
          </p>
        </div>
      </div>

      <EmployeesOverview
        departments={departments}
        departmentTree={departmentTree}
        orgChart={orgChart}
        jobTitles={jobTitles}
        employees={employeesData.items}
        total={employeesData.total}
        page={employeesData.page}
        limit={employeesData.limit}
        initialSearch={params.search || ""}
        initialStatus={params.status || ""}
        initialDepartment={params.departmentCode || ""}
        initialJobTitle={params.jobTitleCode || ""}
      />
    </div>
  )
}
