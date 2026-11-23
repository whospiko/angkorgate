import { z } from "zod"

export interface Scope {
  id: string
  name: string
  displayName?: string | null
  description?: string | null
  claims: string[]
  isDefault: boolean
  realmId?: string
  createdAt?: string
  updatedAt?: string
}

export const CreateScopeSchema = z.object({
  name: z
    .string()
    .min(2, "Scope name must be at least 2 characters")
    .max(100)
    .regex(/^[a-z0-9:_-]{2,100}$/, "Scope name must be lowercase letters, numbers, colons, hyphens"),
  displayName: z.string().max(150).optional(),
  description: z.string().optional(),
  claims: z.array(z.string()).default([]),
  isDefault: z.boolean().default(false),
})

export type CreateScopeInput = z.infer<typeof CreateScopeSchema>
