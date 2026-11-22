import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RiCommunityLine, RiBriefcaseLine, RiTeamLine } from "@remixicon/react"
import type { Department, JobTitle, Employee } from "../types/employees.types"

interface EmployeesOverviewProps {
  departments: Department[]
  jobTitles: JobTitle[]
  employees: Employee[]
}

export function EmployeesOverview({ departments, jobTitles, employees }: EmployeesOverviewProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="border border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <RiCommunityLine className="size-5 text-primary" />
            <CardTitle className="font-heading text-lg">Departments ({departments.length})</CardTitle>
          </div>
          <CardDescription className="font-mono text-xs">
            Organizational units configured in AngkorGate Core
          </CardDescription>
        </CardHeader>
        <CardContent>
          {departments.length === 0 ? (
            <div className="text-muted-foreground font-mono text-xs py-4 text-center">
              No departments configured yet.
            </div>
          ) : (
            <div className="space-y-3 font-mono text-xs">
              {departments.map((d) => (
                <div key={d.code} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0">
                  <div>
                    <div className="font-medium text-foreground font-sans text-sm">{d.name}</div>
                    <div className="text-muted-foreground text-[11px]">{d.description || "No description"}</div>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {d.code}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <RiBriefcaseLine className="size-5 text-primary" />
            <CardTitle className="font-heading text-lg">Job Titles & Roles ({jobTitles.length})</CardTitle>
          </div>
          <CardDescription className="font-mono text-xs">
            Assigned designations and job titles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobTitles.length === 0 ? (
            <div className="text-muted-foreground font-mono text-xs py-4 text-center">
              No job titles defined yet.
            </div>
          ) : (
            <div className="space-y-3 font-mono text-xs">
              {jobTitles.map((jt) => (
                <div key={jt.code} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0">
                  <span className="font-medium text-foreground font-sans text-sm">{jt.name}</span>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {jt.code}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
