export type EmploymentStatus = "ACTIVE" | "ON_LEAVE" | "RESIGNED" | "TERMINATED"
export type EmploymentType = "FULL_TIME" | "PART_TIME" | "CONTRACTOR" | "INTERN"
export type EmployeeGender = "MALE" | "FEMALE" | "OTHER"

export interface Department {
  id?: string
  code: string
  name: string
  description?: string | null
  parentId?: string | null
  isActive?: boolean
  createdAt?: string
}

export interface DepartmentTreeNode extends Department {
  id: string
  children: DepartmentTreeNode[]
}

export interface OrgChartNode {
  id: string
  employeeCode: string
  fullName: string
  employmentStatus: EmploymentStatus
  employmentType: EmploymentType
  managerId: string | null
  primaryPosition: {
    jobTitleCode: string
    jobTitleName: string
    departmentCode: string | null
    departmentName: string | null
  } | null
  children: OrgChartNode[]
}

export interface JobTitle {
  id?: string
  code: string
  name: string
  category?: string | null
  description?: string | null
  isActive?: boolean
  createdAt?: string
}

export interface EmployeePosition {
  id: string
  employeeId: string
  jobTitleId?: string
  departmentId?: string | null
  jobTitle?: JobTitle
  department?: Department | null
  isPrimary: boolean
  startDate?: string | null
  endDate?: string | null
  createdAt?: string
}

export interface EmployeeSchedule {
  id: string
  employeeId: string
  departmentId?: string | null
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
  createdAt?: string
}

export interface ScheduleOverride {
  id: string
  employeeId: string
  date: string
  isAvailable: boolean
  startTime?: string | null
  endTime?: string | null
  reason?: string | null
  createdAt?: string
}

export type LeaveType = "ANNUAL" | "SICK" | "UNPAID" | "MATERNITY" | "OTHER"
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED"

export interface EmployeeBulkImportResult {
  createdCount: number
  skippedCount: number
  errorCount: number
  createdCodes: string[]
  skipped: { rowIndex: number; fullName: string; reason: string; existingCode: string }[]
  errors: { rowIndex: number; fullName: string; message: string }[]
}

export interface AttendanceLog {
  id: string
  employeeId: string
  employee?: {
    id: string
    employeeCode: string
    fullName: string
  } | null
  clockInAt: string
  clockOutAt?: string | null
  source: "WEB" | "KIOSK" | "API"
  notes?: string | null
}

export interface RosterDayCell {
  date: string
  status: "SHIFT" | "OVERRIDE_SHIFT" | "OVERRIDE_OFF" | "ON_LEAVE" | "OFF"
  shifts: { startTime: string; endTime: string }[]
  leaveType?: string
  note?: string
  attendance?: { id: string; clockInAt: string; clockOutAt?: string | null }[]
}

export interface RosterEmployeeRow {
  id: string
  employeeCode: string
  fullName: string
  departmentName?: string | null
  jobTitleName?: string | null
  days: RosterDayCell[]
}

export interface TeamRosterData {
  startDate: string
  endDate: string
  dates: string[]
  employees: RosterEmployeeRow[]
}

export interface LeavePolicy {
  id: string
  leaveType: "ANNUAL" | "SICK" | "MATERNITY"
  annualQuotaDays: number
  enforceQuota: boolean
  updatedAt?: string
}

export interface LeaveRequest {
  id: string
  employeeId: string
  employee?: Employee
  leaveType: LeaveType
  startDate: string
  endDate: string
  reason?: string | null
  status: LeaveStatus
  assignedApproverId?: string | null
  assignedApprover?: {
    id: string
    employeeCode: string
    fullName: string
  } | null
  reviewedById?: string | null
  reviewedBy?: {
    id: string
    email?: string | null
    fullName?: string | null
  } | null
  reviewedAt?: string | null
  reviewNote?: string | null
  attachmentName?: string | null
  attachmentMimeType?: string | null
  attachmentDataUrl?: string | null
  createdAt?: string
}

export interface Employee {
  id: string
  userId?: string | null
  employeeCode: string
  fullName: string
  gender?: EmployeeGender | null
  dateOfBirth?: string | null
  nationalId?: string | null
  phone?: string | null
  address?: string | null
  avatarUrl?: string | null
  hireDate?: string | null
  employmentStatus: EmploymentStatus
  employmentType?: EmploymentType
  managerId?: string | null
  positions?: EmployeePosition[]
  schedules?: EmployeeSchedule[]
  createdAt?: string
  updatedAt?: string
}

export interface PaginatedEmployees {
  items: Employee[]
  total: number
  page: number
  limit: number
}

export interface CreateDepartmentInput {
  code: string
  name: string
  description?: string
  parentId?: string | null
  isActive?: boolean
}

export interface UpdateDepartmentInput {
  name?: string
  description?: string
  parentId?: string | null
  isActive?: boolean
}

export interface CreateJobTitleInput {
  code: string
  name: string
  category?: string
  description?: string
  isActive?: boolean
}

export interface UpdateJobTitleInput {
  name?: string
  category?: string
  description?: string
  isActive?: boolean
}

export interface CreateEmployeeInput {
  userId?: string | null
  provisionUser?: {
    email: string
    password: string
    roles?: string[]
  }
  employeeCode?: string
  fullName: string
  gender?: EmployeeGender
  dateOfBirth?: string
  nationalId?: string
  phone?: string
  address?: string
  avatarUrl?: string
  hireDate?: string
  employmentType?: EmploymentType
  managerId?: string | null
}

export interface UpdateEmployeeInput {
  fullName?: string
  gender?: EmployeeGender
  dateOfBirth?: string
  nationalId?: string
  phone?: string
  address?: string
  avatarUrl?: string
  hireDate?: string
  employmentType?: EmploymentType
  managerId?: string | null
}

export interface AssignPositionInput {
  jobTitleCode: string
  departmentCode?: string
  isPrimary?: boolean
  startDate?: string
  endDate?: string
}

export interface UpdatePositionInput {
  departmentCode?: string | null
  isPrimary?: boolean
  startDate?: string | null
  endDate?: string | null
}

export interface CreateScheduleInput {
  dayOfWeek: number
  startTime: string
  endTime: string
  departmentId?: string
  isActive?: boolean
}

export type UpdateScheduleInput = Partial<CreateScheduleInput>
