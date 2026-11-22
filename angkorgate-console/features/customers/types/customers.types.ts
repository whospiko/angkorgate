export type CustomerType = 'PATIENT' | 'GUEST' | 'CUSTOMER'
export type CustomerGender = 'MALE' | 'FEMALE' | 'OTHER'
export type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE' | 'CHURNED'

export interface CustomerContact {
  id: string
  customerId: string
  contactType?: string
  fullName: string
  relationship?: string
  phone?: string | null
  email?: string | null
  isPrimary?: boolean
  isEmergency?: boolean
  attributes?: Record<string, any>
  createdAt?: string
}

export interface Customer {
  id: string
  code?: string
  fullName: string
  type?: CustomerType
  gender?: CustomerGender
  status?: CustomerStatus
  dateOfBirth?: string
  email?: string | null
  phone?: string | null
  address?: string | null
  nationalId?: string | null
  avatarUrl?: string | null
  contactsCount?: number
  contacts?: CustomerContact[]
  attributes?: Record<string, any>
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

export interface CreateContactInput {
  fullName: string
  relationship?: string
  phone?: string
  email?: string
  address?: string
  isPrimary?: boolean
  isEmergency?: boolean
}
