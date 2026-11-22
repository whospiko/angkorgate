import { z } from "zod"

export interface User {
  id: string
  email: string
  phoneNumber?: string | null
  isActive: boolean
  isEmailVerified: boolean
  roles?: string[]
  failedLoginAttempts?: number
  lockedUntil?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface PaginatedUsers {
  items: User[]
  total: number
  page: number
  limit: number
}

export const CreateUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phoneNumber: z.string().optional(),
  roles: z.array(z.string()).default(["CUSTOMER"]),
  isActive: z.boolean().default(true),
  isEmailVerified: z.boolean().default(true),
})

export type CreateUserInput = z.infer<typeof CreateUserSchema>
