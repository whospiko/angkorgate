import { z } from "zod"

export interface Role {
  id: string
  code: string
  name: string
  description?: string | null
  isSystem?: boolean
  permissions?: string[]
  createdAt?: string
}

export interface Permission {
  id: string
  code: string
  name: string
  description?: string | null
  module?: string
}

export const CreateRoleSchema = z.object({
  code: z.string().min(2).max(50).regex(/^[A-Z0-9_-]+$/, "Role code must be uppercase"),
  name: z.string().min(2).max(100),
  description: z.string().optional(),
})

export type CreateRoleInput = z.infer<typeof CreateRoleSchema>
