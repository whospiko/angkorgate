import { z } from "zod"
import type { Scope } from "@/features/scopes"

export interface AppSetting {
  id?: string
  appCode: string
  name: string
  description?: string | null
  clientSecret?: string | null
  secondaryClientSecret?: string | null
  secondarySecretExpiresAt?: string | null
  rootUrl?: string | null
  homeUrl?: string | null
  validRedirectUris: string[]
  validPostLogoutRedirectUris: string[]
  webOrigins: string[]
  standardFlowEnabled: boolean
  implicitFlowEnabled: boolean
  directAccessGrantsEnabled: boolean
  serviceAccountsEnabled: boolean
  requirePkce: boolean
  isPublicClient: boolean
  realmId?: string
  allowedScopes?: Scope[]
  // Legacy fields
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
  description: z.string().max(255).optional(),
  clientSecret: z.string().optional(),
  rootUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  homeUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  validRedirectUris: z.array(z.string()).optional().default(["http://localhost:5173/callback"]),
  validPostLogoutRedirectUris: z.array(z.string()).optional().default([]),
  webOrigins: z.array(z.string()).optional().default([]),
  standardFlowEnabled: z.boolean().optional().default(true),
  implicitFlowEnabled: z.boolean().optional().default(false),
  directAccessGrantsEnabled: z.boolean().optional().default(false),
  serviceAccountsEnabled: z.boolean().optional().default(false),
  requirePkce: z.boolean().optional().default(true),
  isPublicClient: z.boolean().optional().default(false),
  scopeIds: z.array(z.string()).optional().default([]),
  // Legacy settings
  oauthEnabled: z.boolean().optional().default(false),
  enabledProviders: z.array(z.string()).optional().default([]),
  passwordLoginEnabled: z.boolean().optional().default(true),
  registrationEnabled: z.boolean().optional().default(true),
  emailVerificationRequired: z.boolean().optional().default(true),
  allowedRedirectUrls: z.array(z.string()).optional(),
})

export type CreateAppInput = z.input<typeof CreateAppSchema>

export const UpdateAppSchema = CreateAppSchema.partial().omit({ appCode: true })
export type UpdateAppInput = z.infer<typeof UpdateAppSchema>

export interface KeycloakClientExport {
  clientId: string
  name?: string
  description?: string
  rootUrl?: string
  baseUrl?: string
  redirectUris?: string[]
  webOrigins?: string[]
  publicClient?: boolean
  standardFlowEnabled?: boolean
  implicitFlowEnabled?: boolean
  directAccessGrantsEnabled?: boolean
  serviceAccountsEnabled?: boolean
}
