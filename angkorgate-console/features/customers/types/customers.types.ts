export type CustomerType = "PATIENT" | "GUEST" | "CUSTOMER"
export type CustomerGender = "MALE" | "FEMALE" | "OTHER"
export type CustomerStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED"

export interface CustomerContact {
  id: string
  customerId: string
  fullName: string
  relationship?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  isPrimary?: boolean
  attributes?: Record<string, unknown>
  createdAt?: string
}

export interface Customer {
  id: string
  customerCode: string
  userId?: string | null
  fullName: string
  type: CustomerType
  gender?: CustomerGender | null
  status: CustomerStatus
  dateOfBirth: string
  email?: string | null
  phone?: string | null
  address?: string | null
  nationalId?: string | null
  avatarUrl?: string | null
  isMinor?: boolean
  contacts?: CustomerContact[]
  attributes?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export interface PaginatedCustomers {
  items: Customer[]
  total: number
  page: number
  limit: number
}

export interface CreateCustomerInput {
  fullName: string
  type?: CustomerType
  gender?: CustomerGender
  dateOfBirth: string
  phone?: string
  email?: string
  address?: string
  nationalId?: string
  avatarUrl?: string
  userId?: string
}

export interface UpdateCustomerInput {
  fullName?: string
  gender?: CustomerGender
  dateOfBirth?: string
  phone?: string
  email?: string
  address?: string
  nationalId?: string
  avatarUrl?: string
}

export type CreateContactInput = {
  fullName: string
  relationship?: string
  phone?: string
  email?: string
  address?: string
  isPrimary?: boolean
}

export type UpdateContactInput = Partial<CreateContactInput>

export type AttributeValueType = "string" | "number" | "boolean" | "array<string>" | "object"

export interface AttributeSchemaRule {
  id: string
  targetType: "CUSTOMER" | "EMPLOYEE_POSITION"
  domain: string
  key: string
  valueType: AttributeValueType
  isRequired: boolean
  description?: string | null
}

export interface CsvExportPayload {
  filename: string
  contentType: string
  total: number
  csv: string
}

export interface BulkImportResult {
  createdCount: number
  skippedCount: number
  errorCount: number
  createdCodes: string[]
  skipped: { rowIndex: number; fullName: string; reason: string; existingCode: string }[]
  errors: { rowIndex: number; fullName: string; message: string }[]
}
