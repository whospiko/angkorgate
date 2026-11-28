"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { apiClient, ApiError } from "@/lib/api-client"
import { createUserAction } from "@/features/users/server/users-actions"
import type {
  Department,
  DepartmentTreeNode,
  OrgChartNode,
  JobTitle,
  Employee,
  PaginatedEmployees,
  EmployeePosition,
  EmployeeSchedule,
  ScheduleOverride,
  LeaveRequest,
  LeavePolicy,
  LeaveType,
  AttendanceLog,
  AttendanceSummary,
  TeamRosterData,
  EmployeeBulkImportResult,
  CreateDepartmentInput,
  UpdateDepartmentInput,
  CreateJobTitleInput,
  UpdateJobTitleInput,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  AssignPositionInput,
  UpdatePositionInput,
  CreateScheduleInput,
  UpdateScheduleInput,
} from "../types/employees.types"
import {
  CreateDepartmentSchema,
  UpdateDepartmentSchema,
  CreateJobTitleSchema,
  UpdateJobTitleSchema,
  CreateEmployeeSchema,
  UpdateEmployeeSchema,
  EmploymentStatusSchema,
  AssignPositionSchema,
  CreateScheduleSchema,
  UpdateScheduleSchema,
  CreateLeaveRequestSchema,
  CreateScheduleOverrideSchema,
} from "../types/employees.schemas"

function cleanOptionalStrings<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== "") {
      out[k] = v
    }
  }
  return out as T
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

// --- Departments ---

export async function getDepartments(): Promise<Department[]> {
  try {
    const res = await apiClient.get<Department[]>("/departments")
    return Array.isArray(res) ? res : []
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      redirect("/login?unauthorized=1&redirect=/employees")
    }
    return []
  }
}

export async function getDepartmentTree(): Promise<DepartmentTreeNode[]> {
  try {
    const res = await apiClient.get<DepartmentTreeNode[]>("/departments/tree")
    return Array.isArray(res) ? res : []
  } catch {
    return []
  }
}

export async function getOrgChart(): Promise<OrgChartNode[]> {
  try {
    const res = await apiClient.get<OrgChartNode[]>("/employees/org-chart")
    return Array.isArray(res) ? res : []
  } catch {
    return []
  }
}

export async function createDepartmentAction(
  data: CreateDepartmentInput
): Promise<{ success: boolean; message?: string; data?: Department }> {
  try {
    const parsed = CreateDepartmentSchema.parse(data)
    const created = await apiClient.post<Department>(
      "/departments",
      cleanOptionalStrings(parsed)
    )
    revalidatePath("/employees")
    return { success: true, data: created }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to create department") }
  }
}

export async function updateDepartmentAction(
  code: string,
  data: UpdateDepartmentInput
): Promise<{ success: boolean; message?: string }> {
  try {
    const parsed = UpdateDepartmentSchema.parse(data)
    await apiClient.patch(
      `/departments/${encodeURIComponent(code)}`,
      cleanOptionalStrings(parsed)
    )
    revalidatePath("/employees")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to update department") }
  }
}

export async function deleteDepartmentAction(
  code: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.delete(`/departments/${encodeURIComponent(code)}`)
    revalidatePath("/employees")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to delete department") }
  }
}

// --- Job Titles ---

export async function getJobTitles(category?: string): Promise<JobTitle[]> {
  try {
    const url = category
      ? `/job-titles?category=${encodeURIComponent(category)}`
      : "/job-titles"
    const res = await apiClient.get<JobTitle[]>(url)
    return Array.isArray(res) ? res : []
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      redirect("/login?unauthorized=1&redirect=/employees")
    }
    return []
  }
}

export async function createJobTitleAction(
  data: CreateJobTitleInput
): Promise<{ success: boolean; message?: string; data?: JobTitle }> {
  try {
    const parsed = CreateJobTitleSchema.parse(data)
    const created = await apiClient.post<JobTitle>(
      "/job-titles",
      cleanOptionalStrings(parsed)
    )
    revalidatePath("/employees")
    return { success: true, data: created }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to create job title") }
  }
}

export async function updateJobTitleAction(
  code: string,
  data: UpdateJobTitleInput
): Promise<{ success: boolean; message?: string }> {
  try {
    const parsed = UpdateJobTitleSchema.parse(data)
    await apiClient.patch(
      `/job-titles/${encodeURIComponent(code)}`,
      cleanOptionalStrings(parsed)
    )
    revalidatePath("/employees")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to update job title") }
  }
}

export async function deleteJobTitleAction(
  code: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.delete(`/job-titles/${encodeURIComponent(code)}`)
    revalidatePath("/employees")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to delete job title") }
  }
}

// --- Employees ---

export async function getEmployees(query?: {
  status?: string
  departmentCode?: string
  jobTitleCode?: string
  search?: string
  page?: number
  limit?: number
}): Promise<PaginatedEmployees> {
  try {
    const params = new URLSearchParams()
    if (query?.status) params.set("status", query.status)
    if (query?.departmentCode) params.set("departmentCode", query.departmentCode)
    if (query?.jobTitleCode) params.set("jobTitleCode", query.jobTitleCode)
    if (query?.search) params.set("search", query.search)
    if (query?.page) params.set("page", query.page.toString())
    if (query?.limit) params.set("limit", query.limit.toString())

    const queryStr = params.toString() ? `?${params.toString()}` : ""
    const res = await apiClient.get<
      | Employee[]
      | { data: Employee[]; total?: number; page?: number; limit?: number }
      | PaginatedEmployees
    >(`/employees${queryStr}`)

    if (Array.isArray(res)) {
      return { items: res, total: res.length, page: 1, limit: res.length }
    }
    if (res && "data" in res && Array.isArray(res.data)) {
      return {
        items: res.data,
        total: res.total ?? res.data.length,
        page: res.page ?? 1,
        limit: res.limit ?? 20,
      }
    }
    if (res && "items" in res && Array.isArray(res.items)) {
      return res
    }
    return { items: [], total: 0, page: 1, limit: 20 }
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      redirect("/login?unauthorized=1&redirect=/employees")
    }
    return { items: [], total: 0, page: 1, limit: 20 }
  }
}

export async function exportEmployeesCsvAction(query?: {
  search?: string
  status?: string
  departmentId?: string
  employmentType?: string
}): Promise<{
  success: boolean
  data?: { filename: string; contentType: string; total: number; csv: string }
  message?: string
}> {
  try {
    const params = new URLSearchParams()
    if (query?.search) params.set("search", query.search)
    if (query?.status) params.set("status", query.status)
    if (query?.departmentId) params.set("departmentId", query.departmentId)
    if (query?.employmentType) params.set("employmentType", query.employmentType)
    const qs = params.toString() ? `?${params.toString()}` : ""
    const data = await apiClient.get<{
      filename: string
      contentType: string
      total: number
      csv: string
    }>(`/employees/export${qs}`)
    return { success: true, data }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to export employees CSV") }
  }
}

export async function getEmployee(id: string): Promise<Employee | null> {
  try {
    return await apiClient.get<Employee>(`/employees/${encodeURIComponent(id)}`)
  } catch {
    return null
  }
}

export async function createEmployeeAction(
  input: CreateEmployeeInput
): Promise<{ success: boolean; message?: string; data?: Employee }> {
  try {
    const parsed = CreateEmployeeSchema.parse(input)
    let targetUserId = parsed.userId || undefined

    // Provision a new login user only when explicitly requested
    if (!targetUserId && parsed.provisionUser) {
      const userRes = await createUserAction({
        email: parsed.provisionUser.email,
        password: parsed.provisionUser.password,
        phoneNumber: parsed.phone || undefined,
        roles:
          parsed.provisionUser.roles && parsed.provisionUser.roles.length > 0
            ? parsed.provisionUser.roles
            : ["ASSISTANT"],
        isActive: true,
        isEmailVerified: true,
        mustChangePassword: true,
      })
      if (userRes.success && userRes.data?.id) {
        targetUserId = userRes.data.id
      } else {
        return {
          success: false,
          message: userRes.message || "Failed to provision user account for employee",
        }
      }
    }

    const payload = cleanOptionalStrings({
      fullName: parsed.fullName,
      gender: parsed.gender,
      dateOfBirth: parsed.dateOfBirth,
      nationalId: parsed.nationalId,
      phone: parsed.phone,
      address: parsed.address,
      avatarUrl: parsed.avatarUrl,
      hireDate: parsed.hireDate,
      employmentType: parsed.employmentType,
      managerId: parsed.managerId ?? undefined,
      employeeCode: parsed.employeeCode ? parsed.employeeCode.toUpperCase() : undefined,
      userId: targetUserId,
    })

    const created = await apiClient.post<Employee>("/employees", payload)
    revalidatePath("/employees")
    revalidatePath("/dashboard")
    return { success: true, data: created }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to create employee profile") }
  }
}

export async function updateEmployeeAction(
  id: string,
  data: UpdateEmployeeInput
): Promise<{ success: boolean; message?: string }> {
  try {
    const parsed = UpdateEmployeeSchema.parse(data)
    const payload = cleanOptionalStrings(parsed)

    await apiClient.patch(`/employees/${encodeURIComponent(id)}`, payload)
    revalidatePath("/employees")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to update employee") }
  }
}

export async function linkEmployeeUserAction(
  employeeId: string,
  userId: string | null
): Promise<{ success: boolean; message?: string; data?: Employee }> {
  try {
    const updated = await apiClient.patch<Employee>(
      `/employees/${encodeURIComponent(employeeId)}/user`,
      { userId }
    )
    revalidatePath("/employees")
    revalidatePath("/users")
    return { success: true, data: updated }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to update linked user") }
  }
}

export async function deleteEmployeeAction(
  id: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.delete(`/employees/${encodeURIComponent(id)}`)
    revalidatePath("/employees")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to delete employee") }
  }
}

export async function updateEmployeeStatusAction(
  id: string,
  status: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const validStatus = EmploymentStatusSchema.parse(status.toUpperCase())
    await apiClient.patch(
      `/employees/${encodeURIComponent(id)}/status/${encodeURIComponent(validStatus)}`
    )
    revalidatePath("/employees")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to update employment status") }
  }
}

// --- Positions & Position Attributes ---

export async function getEmployeePositions(
  employeeId: string
): Promise<EmployeePosition[]> {
  try {
    const res = await apiClient.get<EmployeePosition[]>(
      `/employees/${encodeURIComponent(employeeId)}/positions`
    )
    return Array.isArray(res) ? res : []
  } catch {
    return []
  }
}

export async function assignPositionAction(
  employeeId: string,
  data: AssignPositionInput
): Promise<{ success: boolean; message?: string }> {
  try {
    const parsed = AssignPositionSchema.parse(data)
    await apiClient.post(
      `/employees/${encodeURIComponent(employeeId)}/positions`,
      cleanOptionalStrings(parsed)
    )
    revalidatePath("/employees")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to assign position") }
  }
}

export async function updatePositionAction(
  employeeId: string,
  positionId: string,
  data: UpdatePositionInput
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.patch(
      `/employees/${encodeURIComponent(employeeId)}/positions/${encodeURIComponent(positionId)}`,
      data
    )
    revalidatePath("/employees")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to update position") }
  }
}

export async function removePositionAction(
  employeeId: string,
  positionId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.delete(
      `/employees/${encodeURIComponent(employeeId)}/positions/${encodeURIComponent(positionId)}`
    )
    revalidatePath("/employees")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to remove position") }
  }
}

export async function getPositionAttributes(
  employeeId: string,
  positionId: string
): Promise<Record<string, unknown>> {
  try {
    const res = await apiClient.get<Record<string, unknown>>(
      `/employees/${encodeURIComponent(employeeId)}/positions/${encodeURIComponent(positionId)}/attributes`
    )
    return res || {}
  } catch {
    return {}
  }
}

export async function setPositionAttributeAction(
  employeeId: string,
  positionId: string,
  key: string,
  value: unknown
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.put(
      `/employees/${encodeURIComponent(employeeId)}/positions/${encodeURIComponent(positionId)}/attributes/${encodeURIComponent(key)}`,
      { value }
    )
    revalidatePath("/employees")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to set position attribute") }
  }
}

export async function deletePositionAttributeAction(
  employeeId: string,
  positionId: string,
  key: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.delete(
      `/employees/${encodeURIComponent(employeeId)}/positions/${encodeURIComponent(positionId)}/attributes/${encodeURIComponent(key)}`
    )
    revalidatePath("/employees")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to delete position attribute") }
  }
}

// --- Schedules ---

export async function getEmployeeSchedules(
  employeeId: string
): Promise<EmployeeSchedule[]> {
  try {
    const res = await apiClient.get<EmployeeSchedule[]>(
      `/employees/${encodeURIComponent(employeeId)}/schedules`
    )
    return Array.isArray(res) ? res : []
  } catch {
    return []
  }
}

export async function createScheduleAction(
  employeeId: string,
  data: CreateScheduleInput
): Promise<{ success: boolean; message?: string }> {
  try {
    const parsed = CreateScheduleSchema.parse(data)
    await apiClient.post(
      `/employees/${encodeURIComponent(employeeId)}/schedules`,
      parsed
    )
    revalidatePath("/employees")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to create shift schedule") }
  }
}

export async function updateScheduleAction(
  employeeId: string,
  scheduleId: string,
  data: UpdateScheduleInput
): Promise<{ success: boolean; message?: string }> {
  try {
    const parsed = UpdateScheduleSchema.parse(data)
    await apiClient.patch(
      `/employees/${encodeURIComponent(employeeId)}/schedules/${encodeURIComponent(scheduleId)}`,
      parsed
    )
    revalidatePath("/employees")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to update shift schedule") }
  }
}

export async function deleteScheduleAction(
  employeeId: string,
  scheduleId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.delete(
      `/employees/${encodeURIComponent(employeeId)}/schedules/${encodeURIComponent(scheduleId)}`
    )
    revalidatePath("/employees")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to delete schedule") }
  }
}

// --- Schedule Overrides ---

export async function getScheduleOverrides(
  employeeId: string
): Promise<ScheduleOverride[]> {
  try {
    const res = await apiClient.get<ScheduleOverride[]>(
      `/employees/${encodeURIComponent(employeeId)}/schedules/overrides`
    )
    return Array.isArray(res) ? res : []
  } catch {
    return []
  }
}

export async function setScheduleOverrideAction(
  employeeId: string,
  data: {
    date: string
    isAvailable: boolean
    startTime?: string
    endTime?: string
    reason?: string
  }
): Promise<{ success: boolean; message?: string }> {
  try {
    const parsed = CreateScheduleOverrideSchema.parse(data)
    await apiClient.post(
      `/employees/${encodeURIComponent(employeeId)}/schedules/overrides`,
      cleanOptionalStrings(parsed)
    )
    revalidatePath("/employees")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to save schedule override") }
  }
}

export async function deleteScheduleOverrideAction(
  employeeId: string,
  overrideId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.delete(
      `/employees/${encodeURIComponent(employeeId)}/schedules/overrides/${encodeURIComponent(overrideId)}`
    )
    revalidatePath("/employees")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to delete schedule override") }
  }
}

// --- Leave Requests ---

export async function getLeaveRequests(query?: {
  status?: string
  employeeId?: string
}): Promise<LeaveRequest[]> {
  try {
    const params = new URLSearchParams()
    if (query?.status) params.set("status", query.status)
    if (query?.employeeId) params.set("employeeId", query.employeeId)
    const qs = params.toString() ? `?${params.toString()}` : ""
    const res = await apiClient.get<LeaveRequest[] | { data?: LeaveRequest[] }>(
      `/leave-requests${qs}`
    )
    if (Array.isArray(res)) return res
    if (res && Array.isArray(res.data)) return res.data
    return []
  } catch {
    return []
  }
}

export async function getEmployeeLeaveRequests(
  employeeId: string
): Promise<LeaveRequest[]> {
  try {
    const res = await apiClient.get<LeaveRequest[]>(
      `/employees/${encodeURIComponent(employeeId)}/leave-requests`
    )
    return Array.isArray(res) ? res : []
  } catch {
    return []
  }
}

export async function createLeaveRequestAction(
  employeeId: string,
  data: {
    leaveType: LeaveType
    startDate: string
    endDate: string
    reason?: string
    attachmentName?: string
    attachmentMimeType?: "application/pdf" | "image/png" | "image/jpeg"
    attachmentDataUrl?: string
  }
): Promise<{ success: boolean; message?: string }> {
  try {
    const parsed = CreateLeaveRequestSchema.parse(data)
    await apiClient.post(
      `/employees/${encodeURIComponent(employeeId)}/leave-requests`,
      cleanOptionalStrings(parsed)
    )
    revalidatePath("/employees")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to submit leave request") }
  }
}

export async function reviewLeaveRequestAction(
  id: string,
  decision: "APPROVED" | "REJECTED",
  reviewNote?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.patch(`/leave-requests/${encodeURIComponent(id)}/review`, {
      decision,
      reviewNote: reviewNote || undefined,
    })
    revalidatePath("/employees")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to review leave request") }
  }
}

export async function cancelLeaveRequestAction(
  id: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.patch(`/leave-requests/${encodeURIComponent(id)}/cancel`, {})
    revalidatePath("/employees")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to cancel leave request") }
  }
}

export async function getLeavePolicies(): Promise<LeavePolicy[]> {
  try {
    const res = await apiClient.get<LeavePolicy[]>("/leave-policies")
    return Array.isArray(res) ? res : []
  } catch {
    return []
  }
}

export async function updateLeavePolicyAction(
  leaveType: "ANNUAL" | "SICK" | "MATERNITY",
  annualQuotaDays: number,
  enforceQuota = true
): Promise<{ success: boolean; message?: string; data?: LeavePolicy }> {
  try {
    const updated = await apiClient.patch<LeavePolicy>(
      `/leave-policies/${encodeURIComponent(leaveType)}`,
      { annualQuotaDays, enforceQuota }
    )
    revalidatePath("/employees")
    revalidatePath("/account")
    return { success: true, data: updated }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to update leave policy") }
  }
}

export async function getTeamRosterAction(query?: {
  startDate?: string
  endDate?: string
  departmentCode?: string
}): Promise<TeamRosterData> {
  try {
    const params = new URLSearchParams()
    if (query?.startDate) params.set("startDate", query.startDate)
    if (query?.endDate) params.set("endDate", query.endDate)
    if (query?.departmentCode) params.set("departmentCode", query.departmentCode)
    const qs = params.toString() ? `?${params.toString()}` : ""
    const res = await apiClient.get<TeamRosterData>(`/employees/roster${qs}`)
    return res ?? { startDate: "", endDate: "", dates: [], employees: [] }
  } catch {
    return { startDate: "", endDate: "", dates: [], employees: [] }
  }
}

export async function getAttendanceLogsAction(employeeId?: string): Promise<AttendanceLog[]> {
  try {
    const qs = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : ""
    const res = await apiClient.get<AttendanceLog[]>(`/employees/attendance${qs}`)
    return Array.isArray(res) ? res : []
  } catch {
    return []
  }
}

export async function getAttendanceSummaryAction(query?: {
  startDate?: string
  endDate?: string
  employeeId?: string
}): Promise<AttendanceSummary | null> {
  try {
    const params = new URLSearchParams()
    if (query?.startDate) params.set("startDate", query.startDate)
    if (query?.endDate) params.set("endDate", query.endDate)
    if (query?.employeeId) params.set("employeeId", query.employeeId)
    const qs = params.toString() ? `?${params.toString()}` : ""
    return await apiClient.get<AttendanceSummary>(`/employees/attendance/summary${qs}`)
  } catch {
    return null
  }
}

export async function exportAttendanceCsvAction(query?: {
  startDate?: string
  endDate?: string
  employeeId?: string
}): Promise<{
  success: boolean
  data?: { filename: string; contentType: string; total: number; csv: string }
  message?: string
}> {
  try {
    const params = new URLSearchParams()
    if (query?.startDate) params.set("startDate", query.startDate)
    if (query?.endDate) params.set("endDate", query.endDate)
    if (query?.employeeId) params.set("employeeId", query.employeeId)
    const qs = params.toString() ? `?${params.toString()}` : ""
    const data = await apiClient.get<{
      filename: string
      contentType: string
      total: number
      csv: string
    }>(`/employees/attendance/export${qs}`)
    return { success: true, data }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to export attendance CSV") }
  }
}

export async function clockInEmployeeAction(
  employeeId: string,
  notes?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.post(`/employees/${encodeURIComponent(employeeId)}/attendance/clock-in`, {
      notes: notes || undefined,
      source: "WEB",
    })
    revalidatePath("/employees")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to clock in") }
  }
}

export async function clockOutEmployeeAction(
  employeeId: string,
  notes?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.post(`/employees/${encodeURIComponent(employeeId)}/attendance/clock-out`, {
      notes: notes || undefined,
    })
    revalidatePath("/employees")
    return { success: true }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to clock out") }
  }
}

export async function importEmployeesBulkAction(
  rows: CreateEmployeeInput[],
  skipDuplicates = true
): Promise<{ success: boolean; data?: EmployeeBulkImportResult; message?: string }> {
  try {
    const cleanedRows = rows.map((row) => cleanOptionalStrings(row))
    const data = await apiClient.post<EmployeeBulkImportResult>("/employees/import", {
      rows: cleanedRows,
      skipDuplicates,
    })
    revalidatePath("/employees")
    revalidatePath("/dashboard")
    return { success: true, data }
  } catch (error: unknown) {
    return { success: false, message: getErrorMessage(error, "Failed to import employees") }
  }
}
