export interface AuditLog {
  id: string
  action: string
  entity: string
  entityId?: string | null
  userId?: string | null
  actorEmail?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  changes?: Record<string, any> | null
  createdAt: string
}

export interface PaginatedAuditLogs {
  items: AuditLog[]
  total: number
  page: number
  limit: number
}
