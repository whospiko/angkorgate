export interface SystemHealth {
  status: string
  cache: {
    provider: string
    connected: boolean
    enabled: boolean
    prefix: string
    itemCount: number
  }
}

export interface CacheStatus {
  provider: string
  connected: boolean
  enabled: boolean
  prefix: string
  itemCount: number
}

export interface OpenApiOperation {
  summary?: string
  description?: string
  tags?: string[]
  security?: Record<string, string[]>[]
  parameters?: {
    name: string
    in: string
    required?: boolean
    description?: string
    schema?: { type?: string }
  }[]
  requestBody?: {
    required?: boolean
    content?: Record<string, { schema?: Record<string, unknown> }>
  }
  responses?: Record<string, { description?: string }>
}

export interface OpenApiSpec {
  openapi?: string
  info?: {
    title?: string
    description?: string
    version?: string
  }
  tags?: { name: string; description?: string }[]
  paths?: Record<string, Record<string, OpenApiOperation>>
}
