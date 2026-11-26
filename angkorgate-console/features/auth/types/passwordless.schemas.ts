import { z } from "zod"

export const MagicLinkRequestSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  redirectUrl: z.string().max(512).optional(),
})

export const MagicLinkVerifySchema = z.object({
  token: z.string().min(1, "Magic link token is required."),
})

export const OtpChannelSchema = z.enum(["email", "sms"])

export const OtpRequestSchema = z
  .object({
    channel: OtpChannelSchema,
    email: z.string().trim().optional(),
    phone: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.channel === "email") {
      if (!data.email || !z.string().email().safeParse(data.email).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: "Please enter a valid email address.",
        })
      }
    } else if (data.channel === "sms") {
      if (!data.phone || !/^\+?[1-9]\d{6,14}$/.test(data.phone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phone"],
          message: "Enter a valid international phone number (e.g. +85512345678).",
        })
      }
    }
  })

export const OtpVerifySchema = z
  .object({
    channel: OtpChannelSchema,
    email: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Please enter the 6-digit numeric code."),
  })
  .superRefine((data, ctx) => {
    if (data.channel === "email") {
      if (!data.email || !z.string().email().safeParse(data.email).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: "Please enter a valid email address.",
        })
      }
    } else if (data.channel === "sms") {
      if (!data.phone || !/^\+?[1-9]\d{6,14}$/.test(data.phone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phone"],
          message: "Enter a valid international phone number (e.g. +85512345678).",
        })
      }
    }
  })

export type MagicLinkRequestInput = z.infer<typeof MagicLinkRequestSchema>
export type OtpRequestInput = z.infer<typeof OtpRequestSchema>
export type OtpVerifyInput = z.infer<typeof OtpVerifySchema>

export interface PasswordlessRequestResponse {
  message: string
  channel: "magic_link" | "email_otp" | "sms_otp"
  expiresInSeconds: number
}
