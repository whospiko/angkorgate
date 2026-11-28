import {
  AttendanceManager,
  getAttendanceLogsAction,
  getAttendancePoliciesAction,
  getAttendanceSummaryAction,
  getDepartments,
  getEmployees,
} from "@/features/employees"

export const metadata = {
  title: "Attendance & Policies | AngkorGate",
}

export default async function AttendancePage() {
  const [policies, logs, summary, employeesData, departments] = await Promise.all([
    getAttendancePoliciesAction(),
    getAttendanceLogsAction(),
    getAttendanceSummaryAction(),
    getEmployees({ limit: 100 }),
    getDepartments(),
  ])

  return (
    <AttendanceManager
      initialPolicies={policies}
      initialLogs={logs}
      initialSummary={summary}
      employees={employeesData.items}
      departments={departments}
    />
  )
}
