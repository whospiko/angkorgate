import { z } from "zod"

export interface LinkedSocialAccount {
  id: string
  provider: string
  providerUserId: string
  email: string | null
  emailVerifiedAt?: string | null
  rawProfile?: Record<string, unknown> | null
  linkedAt: string
  lastLoginAt?: string | null
}

export interface User {
  id: string
  email: string | null
  phone?: string | null
  fullName?: string | null
  oauthProviders?: string[]
  phoneNumber?: string | null
  isActive: boolean
  isEmailVerified: boolean
  isPhoneVerified?: boolean
  mustChangePassword?: boolean
  failedAttempts?: number
  failedLoginAttempts?: number
  lockedUntil?: string | null
  roles?: string[]
  lastLoginAt?: string | null
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
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phoneNumber: z.string().optional(),
  roles: z.array(z.string()).optional().default(["CUSTOMER"]),
  isActive: z.boolean().optional().default(true),
  isEmailVerified: z.boolean().optional().default(true),
  isPhoneVerified: z.boolean().optional().default(false),
  mustChangePassword: z.boolean().optional().default(false),
})

export type CreateUserInput = z.input<typeof CreateUserSchema>

export const UpdateUserSchema = z.object({
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  isEmailVerified: z.boolean().optional(),
  isPhoneVerified: z.boolean().optional(),
  mustChangePassword: z.boolean().optional(),
})

export type UpdateUserInput = z.input<typeof UpdateUserSchema>

export const AdminResetPasswordSchema = z.object({
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  mustChangePassword: z.boolean().optional().default(true),
})

export type AdminResetPasswordInput = z.input<typeof AdminResetPasswordSchema>

export type LinkedAccount =
  | {
      type: "customer"
      data: {
        id: string
        customerCode?: string
        fullName: string
        type?: string
        status?: string
        phone?: string | null
        email?: string | null
      }
    }
  | {
      type: "employee"
      data: {
        id: string
        employeeCode: string
        fullName: string
        employmentStatus: string
        departmentCode?: string | null
        jobTitleCode?: string | null
        phone?: string | null
      }
    }
  | {
      type: "none"
    }
