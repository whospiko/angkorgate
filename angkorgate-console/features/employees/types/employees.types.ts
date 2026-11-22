export type EmploymentStatus = 'PROBATION' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED'
export type EmployeeGender = 'MALE' | 'FEMALE' | 'OTHER'

export interface Department {
  id?: string
  code: string
  name: string
  description?: string | null
  parentCode?: string | null
  createdAt?: string
}

export interface JobTitle {
  id?: string
  code: string
  name: string
  category?: string
  departmentCode?: string | null
  description?: string | null
  createdAt?: string
}

export interface EmployeePosition {
  id: string
  employeeId: string
  jobTitleCode: string
  departmentCode?: string | null
  isPrimary: boolean
  startDate?: string
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
  isRecurring: boolean
  createdAt?: string
}

export interface Employee {
  id: string
  userId?: string
  employeeCode: string
  fullName: string
  gender?: EmployeeGender
  dateOfBirth?: string
  nationalId?: string | null
  phone?: string | null
  address?: string | null
  avatarUrl?: string | null
  hireDate?: string
  status?: EmploymentStatus
  department?: string
  position?: string
  positions?: EmployeePosition[]
  schedules?: EmployeeSchedule[]
  createdAt?: string
  updatedAt?: string
}

export interface CreateDepartmentInput {
  code: string
  name: string
  description?: string
  parentCode?: string
}

export interface UpdateDepartmentInput {
  name?: string
  description?: string
  parentCode?: string
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
  userId?: string
  userEmail?: string
  employeeCode: string
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

export interface CreateScheduleInput {
  dayOfWeek: number
  startTime: string
  endTime: string
  departmentId?: string
  isRecurring?: boolean
}
