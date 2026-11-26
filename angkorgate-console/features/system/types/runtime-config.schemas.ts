import { z } from "zod"

export const RuntimeSettingCategorySchema = z.enum([
  "mail",
  "sms",
  "passwordless",
  "webauthn",
  "auth",
])

export type RuntimeSettingCategory = z.infer<
  typeof RuntimeSettingCategorySchema
>

export interface RuntimeSettingView {
  key: string
  category: RuntimeSettingCategory
  label: string
  description: string
  inputType: "text" | "number" | "password" | "boolean" | "select"
  options?: string[]
  isSecret: boolean
  hasSecret: boolean
  value: string
  defaultValue: string
  placeholder?: string
  source: "database" | "env" | "default"
  updatedAt?: string
}

export interface PublicAuthMethods {
  passkeyEnabled: boolean
  magicLinkEnabled: boolean
  emailOtpEnabled: boolean
  smsOtpEnabled: boolean
}

export const UpdateRuntimeConfigSchema = z.object({
  settings: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.null()])
  ),
})

export const TestMailSchema = z.object({
  to: z.string().trim().email("Enter a valid recipient email address."),
})

export const TestSmsSchema = z.object({
  to: z
    .string()
    .trim()
    .regex(
      /^\+?[1-9]\d{6,14}$/,
      "Enter a valid E.164 phone number (e.g. +85512345678)."
    ),
})
