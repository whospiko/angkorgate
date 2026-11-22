import { z } from "zod"

export interface OAuthProvider {
  id?: string
  code: string // 'google', 'apple'
  name: string
  isActive: boolean
  clientId: string
  clientSecret?: string
  scopes?: string
  extraConfig?: Record<string, any>
  createdAt?: string
}

export const CreateOAuthProviderSchema = z.object({
  code: z.string().min(2).max(50).toLowerCase(),
  name: z.string().min(2).max(100),
  clientId: z.string().min(2),
  clientSecret: z.string().optional(),
  scopes: z.string().default("openid email profile"),
  isActive: z.boolean().default(true),
})

export type CreateOAuthProviderInput = z.infer<typeof CreateOAuthProviderSchema>
