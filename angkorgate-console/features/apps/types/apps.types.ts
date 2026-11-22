import { z } from "zod"

export interface AppSetting {
  id?: string
  appCode: string
  name: string
  clientSecret?: string | null
  oauthEnabled: boolean
  enabledProviders: string[]
  passwordLoginEnabled: boolean
  registrationEnabled: boolean
  emailVerificationRequired: boolean
  allowedRedirectUrls: string[]
  createdAt?: string
  updatedAt?: string
}

export const CreateAppSchema = z.object({
  appCode: z
    .string()
    .min(2, "App code must be at least 2 characters")
    .max(50)
    .regex(/^[a-z][a-z0-9-]{1,49}$/, "App code must be lowercase letters, numbers, or hyphens"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  clientSecret: z.string().optional(),
  oauthEnabled: z.boolean().default(false),
  enabledProviders: z.array(z.string()).default([]),
  passwordLoginEnabled: z.boolean().default(true),
  registrationEnabled: z.boolean().default(true),
  emailVerificationRequired: z.boolean().default(true),
  allowedRedirectUrls: z
    .array(z.string())
    .default(["http://localhost:5173/callback"]),
})

export type CreateAppInput = z.infer<typeof CreateAppSchema>
