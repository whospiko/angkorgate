import { z } from "zod"

export const OAUTH_PROVIDER_CODES = [
  "google",
  "github",
  "discord",
  "microsoft",
  "telegram",
  "apple",
] as const

export type OAuthProviderCode = (typeof OAUTH_PROVIDER_CODES)[number]

export interface OAuthProvider {
  id?: string
  code: string
  name: string
  isActive: boolean
  clientId: string
  clientSecret?: string | null
  scopes?: string | null
  extraConfig?: Record<string, unknown> | null
  createdAt?: string
  updatedAt?: string
}

export interface PublicOAuthProvider {
  code: string
  name: string
}

export interface OAuthProviderPreset {
  code: OAuthProviderCode
  name: string
  shortName: string
  defaultScopes: string
  clientIdLabel: string
  clientIdPlaceholder: string
  clientSecretLabel: string
  clientSecretPlaceholder: string
  requiresSecret: boolean
  description: string
}

export interface GlobalOAuthSettings {
  oauthEnabled: boolean
  callbackBaseUrl: string | null
  webUrl: string
}

export const UpdateOAuthSettingsSchema = z.object({
  oauthEnabled: z.boolean().optional(),
  callbackBaseUrl: z.string().optional(),
  webUrl: z.string().url("Must be a valid URL with http:// or https://").optional(),
})

export type UpdateOAuthSettingsInput = z.infer<typeof UpdateOAuthSettingsSchema>

export const OAUTH_PROVIDER_PRESETS: Record<OAuthProviderCode, OAuthProviderPreset> = {
  google: {
    code: "google",
    name: "Google",
    shortName: "Google",
    defaultScopes: "email profile",
    clientIdLabel: "Client ID",
    clientIdPlaceholder: "1234567890-abcdef.apps.googleusercontent.com",
    clientSecretLabel: "Client Secret",
    clientSecretPlaceholder: "GOCSPX-...",
    requiresSecret: true,
    description: "Google Identity OAuth 2.0",
  },
  github: {
    code: "github",
    name: "GitHub",
    shortName: "GitHub",
    defaultScopes: "read:user user:email",
    clientIdLabel: "Client ID",
    clientIdPlaceholder: "Ov23li...",
    clientSecretLabel: "Client Secret",
    clientSecretPlaceholder: "GitHub OAuth App Secret",
    requiresSecret: true,
    description: "GitHub OAuth Apps & developer accounts",
  },
  discord: {
    code: "discord",
    name: "Discord",
    shortName: "Discord",
    defaultScopes: "identify email",
    clientIdLabel: "Application Client ID",
    clientIdPlaceholder: "123456789012345678",
    clientSecretLabel: "Client Secret",
    clientSecretPlaceholder: "Discord OAuth2 Client Secret",
    requiresSecret: true,
    description: "Discord OAuth2 community identity",
  },
  microsoft: {
    code: "microsoft",
    name: "Microsoft Entra ID",
    shortName: "Microsoft",
    defaultScopes: "openid profile email User.Read",
    clientIdLabel: "Application (Client) ID",
    clientIdPlaceholder: "00000000-0000-0000-0000-000000000000",
    clientSecretLabel: "Client Secret Value",
    clientSecretPlaceholder: "Entra ID client secret value",
    requiresSecret: true,
    description: "Microsoft Entra ID (Azure AD) & personal MSA",
  },
  telegram: {
    code: "telegram",
    name: "Telegram",
    shortName: "Telegram",
    defaultScopes: "",
    clientIdLabel: "Bot Username (without @)",
    clientIdPlaceholder: "angkorgate_auth_bot",
    clientSecretLabel: "Bot Token",
    clientSecretPlaceholder: "123456789:AAH...",
    requiresSecret: true,
    description: "Telegram Login Widget via BotFather HMAC-SHA256",
  },
  apple: {
    code: "apple",
    name: "Apple",
    shortName: "Apple",
    defaultScopes: "name email",
    clientIdLabel: "Services ID",
    clientIdPlaceholder: "com.example.auth",
    clientSecretLabel: "Client Secret (optional)",
    clientSecretPlaceholder: "Optional for Apple JWT flow",
    requiresSecret: false,
    description: "Sign in with Apple",
  },
}

export const CreateOAuthProviderSchema = z.object({
  code: z.enum(OAUTH_PROVIDER_CODES),
  name: z.string().min(2).max(100),
  clientId: z
    .string()
    .min(2)
    .regex(/^[^\s]+$/, "Client ID must not contain whitespace"),
  clientSecret: z.string().optional(),
  scopes: z.string().max(255).optional(),
  isActive: z.boolean().default(true),
  extraConfig: z.record(z.string(), z.unknown()).optional(),
})

export const UpdateOAuthProviderSchema = CreateOAuthProviderSchema.omit({
  code: true,
}).partial()

export type CreateOAuthProviderInput = z.infer<typeof CreateOAuthProviderSchema>
export type UpdateOAuthProviderInput = z.infer<typeof UpdateOAuthProviderSchema>
