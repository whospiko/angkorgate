"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { RiCommunityLine, RiGitBranchLine, RiUserLine } from "@remixicon/react"
import type { DepartmentTreeNode, OrgChartNode } from "../types/employees.types"

interface OrgChartViewProps {
  orgChart: OrgChartNode[]
  departmentTree: DepartmentTreeNode[]
}

function OrgNodeItem({ node, depth = 0 }: { node: OrgChartNode; depth?: number }) {
  return (
    <div className={depth > 0 ? "ml-6 pl-4 border-l border-border/60 mt-2" : "mt-2"}>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-card p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <RiUserLine className="size-4" />
          </div>
          <div>
            <div className="font-sans text-sm font-semibold text-foreground">
              {node.fullName}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5">
              <span className="text-primary font-semibold">{node.employeeCode}</span>
              {node.primaryPosition && (
                <>
                  <span>&bull;</span>
                  <span>{node.primaryPosition.jobTitleName}</span>
                  {node.primaryPosition.departmentName && (
                    <Badge variant="outline" className="text-[10px]">
                      {node.primaryPosition.departmentName}
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <Badge variant="secondary" className="text-[10px]">
            {node.employmentType}
          </Badge>
          <Badge
            variant="outline"
            className={
              node.employmentStatus === "ACTIVE"
                ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground"
            }
          >
            {node.employmentStatus}
          </Badge>
        </div>
      </div>

      {node.children.map((child) => (
        <OrgNodeItem key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

function DeptNodeItem({ node, depth = 0 }: { node: DepartmentTreeNode; depth?: number }) {
  return (
    <div className={depth > 0 ? "ml-5 pl-3 border-l border-border/60 mt-2" : "mt-2"}>
      <div className="flex items-center justify-between rounded-md border border-border/50 bg-muted/20 px-3 py-2 font-mono text-xs">
        <div className="flex items-center gap-2">
          <RiCommunityLine className="size-3.5 text-primary" />
          <span className="font-sans text-sm font-medium text-foreground">{node.name}</span>
          <Badge variant="outline" className="text-[10px] text-primary">
            {node.code}
          </Badge>
        </div>
        {node.children.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {node.children.length} sub-unit{node.children.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {node.children.map((child) => (
        <DeptNodeItem key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

export function OrgChartView({ orgChart, departmentTree }: OrgChartViewProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Card className="lg:col-span-7 border border-border/50">
        <CardHeader>
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <RiGitBranchLine className="size-4 text-primary" />
            Reporting Lines & Org Chart
          </CardTitle>
          <CardDescription className="font-mono text-xs">
            Staff hierarchy organized by reporting manager.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orgChart.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground italic">
              No employees registered yet.
            </p>
          ) : (
            <div className="space-y-2">
              {orgChart.map((root) => (
                <OrgNodeItem key={root.id} node={root} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-5 border border-border/50">
        <CardHeader>
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <RiCommunityLine className="size-4 text-primary" />
            Department Hierarchy
          </CardTitle>
          <CardDescription className="font-mono text-xs">
            Nested operational units and sub-departments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {departmentTree.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground italic">
              No departments configured yet.
            </p>
          ) : (
            <div className="space-y-2">
              {departmentTree.map((root) => (
                <DeptNodeItem key={root.id} node={root} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
