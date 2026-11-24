export type ApiKeyStatus = "ACTIVE" | "REVOKED" | "EXPIRED"

export interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  lastFour: string
  maskedKey: string
  userId: string
  userEmail?: string
  appCode: string | null
  status: ApiKeyStatus
  allowedResources: string[]
  allowedMethods: Record<string, string[]>
  permissions: string[]
  fieldProjections: Record<string, string[]>
  rateLimit: number
  expiresAt: string | null
  lastUsedAt: string | null
  totalRequests: number
  createdAt: string
  updatedAt: string
}

export interface ApiKeyCreatedResponse extends ApiKey {
  secretKey: string
}

export interface ResourceFieldMeta {
  name: string
  label: string
  type: string
  isPii: boolean
  isDefault: boolean
}

export interface ResourceSchemaMeta {
  resource: string
  title: string
  description: string
  basePath: string
  supportedMethods: ("GET" | "POST" | "PATCH" | "PUT" | "DELETE")[]
  fields: ResourceFieldMeta[]
}

export interface CreateApiKeyInput {
  name: string
  environment?: "live" | "test"
  appCode?: string
  expirationDays?: number
  allowedResources?: string[]
  allowedMethods?: Record<string, string[]>
  permissions?: string[]
  fieldProjections?: Record<string, string[]>
  rateLimit?: number
}

export interface UpdateApiKeyInput {
  name?: string
  status?: "ACTIVE" | "REVOKED"
  allowedResources?: string[]
  allowedMethods?: Record<string, string[]>
  permissions?: string[]
  fieldProjections?: Record<string, string[]>
  rateLimit?: number
  expiresAt?: string | null
}
