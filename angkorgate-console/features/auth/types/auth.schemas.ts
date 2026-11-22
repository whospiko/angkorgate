import { z } from "zod"

export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required"),
})

export type LoginInput = z.infer<typeof LoginSchema>

export interface UserSummary {
  id: string
  email: string | null
  phone: string | null
  roles: string[]
  mustChangePassword: boolean
}

export interface AuthSuccessData {
  accessToken: string
  refreshToken: string
  accessTokenExpiresIn: number
  refreshTokenExpiresIn: number
  user: UserSummary
}

export type AuthActionResult = {
  success: boolean
  message?: string
  errors?: {
    email?: string[]
    password?: string[]
  }
}
