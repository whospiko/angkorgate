import type {
  Employee,
  EmployeeSchedule,
  LeaveRequest,
  LeaveType,
  ScheduleOverride,
} from "@/features/employees"

export interface LinkedCustomerSummary {
  id: string
  customerCode: string
  type: string
  status?: string
}

export interface LinkedEmployeeSummary {
  id: string
  employeeCode: string
  employmentStatus?: string
}

export interface UserProfile {
  id: string
  email: string | null
  phone: string | null
  fullName: string | null
  roles: string[]
  permissions: string[]
  isEmailVerified: boolean
  isPhoneVerified: boolean
  mfaEnabled: boolean
  passkeysCount: number
  createdAt: string
  customer?: LinkedCustomerSummary | null
  employee?: LinkedEmployeeSummary | null
}

export interface UpdateProfileInput {
  fullName?: string
  phone?: string
}

export type SessionDeviceType =
  | "desktop"
  | "mobile"
  | "tablet"
  | "cli"
  | "bot"
  | "unknown"

export interface AccountSession {
  id: string
  familyId?: string
  userAgent?: string | null
  browser?: string
  os?: string
  deviceType?: SessionDeviceType
  ipAddress?: string | null
  lastActiveAt?: string
  createdAt: string
  expiresAt: string
  isCurrent: boolean
}

export interface AccountActionResult<T = unknown> {
  success: boolean
  message?: string
  data?: T
  errors?: Record<string, string[]>
}

export interface MyLeaveBalanceItem {
  leaveType: "ANNUAL" | "SICK" | "MATERNITY"
  allowanceDays: number
  usedDays: number
  pendingDays: number
  remainingDays: number
}

export interface MyLeaveBalanceSummary {
  year: number
  items: MyLeaveBalanceItem[]
}

export interface MyWorkspaceData {
  employee: Employee | null
  schedules: EmployeeSchedule[]
  overrides: ScheduleOverride[]
  leaveRequests: LeaveRequest[]
  balances: MyLeaveBalanceSummary | null
}

export interface SubmitMyLeaveInput {
  leaveType: LeaveType
  startDate: string
  endDate: string
  reason?: string
  attachmentName?: string
  attachmentMimeType?: "application/pdf" | "image/png" | "image/jpeg"
  attachmentDataUrl?: string
}
