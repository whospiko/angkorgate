"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { apiClient, ApiError } from "@/lib/api-client"
import { createUserAction } from "@/features/users/server/users-actions"
import type {
  Department,
  JobTitle,
  Employee,
  EmployeePosition,
  EmployeeSchedule,
  CreateDepartmentInput,
  UpdateDepartmentInput,
  CreateJobTitleInput,
  UpdateJobTitleInput,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  AssignPositionInput,
  CreateScheduleInput,
} from "../types/employees.types"

// --- Departments ---

export async function getDepartments(): Promise<Department[]> {
  try {
    const res = await apiClient.get<Department[]>("/departments")
    return Array.isArray(res) ? res : []
  } catch {
    return []
  }
}

export async function createDepartmentAction(
  data: CreateDepartmentInput
): Promise<{ success: boolean; message?: string; data?: Department }> {
  try {
    const created = await apiClient.post<Department>("/departments", data)
    revalidatePath("/employees")
    return { success: true, data: created }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to create department" }
  }
}

export async function updateDepartmentAction(
  code: string,
  data: UpdateDepartmentInput
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.patch(`/departments/${encodeURIComponent(code)}`, data)
    revalidatePath("/employees")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to update department" }
  }
}

export async function deleteDepartmentAction(
  code: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.delete(`/departments/${encodeURIComponent(code)}`)
    revalidatePath("/employees")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to delete department" }
  }
}

export async function seedDepartmentsAction(
  template: string = "clinic"
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.post(`/departments/seed/${encodeURIComponent(template)}`)
    revalidatePath("/employees")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to seed departments template" }
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
  } catch {
    return []
  }
}

export async function createJobTitleAction(
  data: CreateJobTitleInput
): Promise<{ success: boolean; message?: string; data?: JobTitle }> {
  try {
    const created = await apiClient.post<JobTitle>("/job-titles", data)
    revalidatePath("/employees")
    return { success: true, data: created }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to create job title" }
  }
}

export async function updateJobTitleAction(
  code: string,
  data: UpdateJobTitleInput
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.patch(`/job-titles/${encodeURIComponent(code)}`, data)
    revalidatePath("/employees")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to update job title" }
  }
}

export async function deleteJobTitleAction(
  code: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.delete(`/job-titles/${encodeURIComponent(code)}`)
    revalidatePath("/employees")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to delete job title" }
  }
}

// --- Employees ---

export async function getEmployees(query?: {
  status?: string
  departmentCode?: string
  jobTitleCode?: string
  page?: number
  limit?: number
}): Promise<Employee[]> {
  try {
    const params = new URLSearchParams()
    if (query?.status) params.set("status", query.status)
    if (query?.departmentCode) params.set("departmentCode", query.departmentCode)
    if (query?.jobTitleCode) params.set("jobTitleCode", query.jobTitleCode)
    if (query?.page) params.set("page", query.page.toString())
    if (query?.limit) params.set("limit", query.limit.toString())

    const queryStr = params.toString() ? `?${params.toString()}` : ""
    const res = await apiClient.get<any>(`/employees${queryStr}`)

    if (Array.isArray(res)) return res
    if (res && Array.isArray(res.data)) return res.data
    if (res && Array.isArray(res.items)) return res.items
    return []
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401) {
      redirect("/login?unauthorized=1&redirect=/employees")
    }
    return []
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
    let targetUserId = input.userId

    // If userId not provided, provision a user account for this staff member
    if (!targetUserId) {
      const email =
        input.userEmail ||
        `emp.${input.employeeCode.toLowerCase()}@angkorgate.local`
      const userRes = await createUserAction({
        email,
        password: "StaffPassword@1234",
        phoneNumber: input.phone || undefined,
        roles: ["ASSISTANT"],
        isActive: true,
        isEmailVerified: true,
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

    const { userEmail, ...rest } = input
    const payload = {
      ...rest,
      userId: targetUserId,
    }
    // Clean undefined fields
    Object.keys(payload).forEach(
      (key) => (payload as any)[key] === undefined && delete (payload as any)[key]
    )

    const created = await apiClient.post<Employee>("/employees", payload)
    revalidatePath("/employees")
    revalidatePath("/dashboard")
    return { success: true, data: created }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to create employee profile" }
  }
}

export async function updateEmployeeAction(
  id: string,
  data: UpdateEmployeeInput
): Promise<{ success: boolean; message?: string }> {
  try {
    const payload = { ...data }
    Object.keys(payload).forEach(
      (key) => (payload as any)[key] === undefined && delete (payload as any)[key]
    )

    await apiClient.patch(`/employees/${encodeURIComponent(id)}`, payload)
    revalidatePath("/employees")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to update employee" }
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
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to delete employee" }
  }
}

export async function updateEmployeeStatusAction(
  id: string,
  status: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await apiClient.patch(
      `/employees/${encodeURIComponent(id)}/status/${encodeURIComponent(status)}`
    )
    revalidatePath("/employees")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to update employment status" }
  }
}

// --- Positions ---

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
    await apiClient.post(
      `/employees/${encodeURIComponent(employeeId)}/positions`,
      data
    )
    revalidatePath("/employees")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to assign position" }
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
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to remove position" }
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
    await apiClient.post(
      `/employees/${encodeURIComponent(employeeId)}/schedules`,
      data
    )
    revalidatePath("/employees")
    return { success: true }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to create shift schedule" }
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
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to delete schedule" }
  }
}
