export interface Customer {
  id: string
  code?: string
  name: string
  type?: string
  status?: string
  email?: string | null
  phone?: string | null
  contactsCount?: number
  createdAt?: string
}

export interface PaginatedCustomers {
  items: Customer[]
  total: number
  page: number
  limit: number
}
