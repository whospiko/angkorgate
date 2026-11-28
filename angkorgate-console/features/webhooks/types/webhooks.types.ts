export type WebhookEventType =
  | "customer.created"
  | "employee.onboarded"
  | "leave.approved"

export interface WebhookEndpoint {
  id: string
  name: string
  url: string
  secret: string
  events: string[]
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface WebhookDelivery {
  id: string
  endpointId: string
  event: string
  payload: Record<string, unknown>
  signature: string
  status: "PENDING" | "DELIVERED" | "FAILED"
  statusCode?: number | null
  responseBody?: string | null
  attempts: number
  deliveredAt?: string | null
  createdAt?: string
}
