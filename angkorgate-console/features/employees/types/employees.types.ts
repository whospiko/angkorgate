export interface Department {
  id?: string
  code: string
  name: string
  description?: string | null
}

export interface JobTitle {
  id?: string
  code: string
  name: string
  departmentCode?: string
}

export interface Employee {
  id: string
  code?: string
  name?: string
  email?: string
  department?: string
  position?: string
  status?: string
}
