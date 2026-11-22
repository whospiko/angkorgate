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
