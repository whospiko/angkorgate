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

export interface AccountSession {
  id: string
  userAgent?: string | null
  ipAddress?: string | null
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
