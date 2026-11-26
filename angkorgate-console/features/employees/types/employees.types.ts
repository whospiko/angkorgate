export type EmploymentStatus = "ACTIVE" | "ON_LEAVE" | "RESIGNED" | "TERMINATED"
export type EmployeeGender = "MALE" | "FEMALE" | "OTHER"

export interface Department {
  id?: string
  code: string
  name: string
  description?: string | null
  isActive?: boolean
  createdAt?: string
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
  isActive?: boolean
}

export interface UpdateDepartmentInput {
  name?: string
  description?: string
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
