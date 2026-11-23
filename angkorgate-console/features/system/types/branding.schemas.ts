import { z } from "zod"

export const InitialSetupSchema = z
  .object({
    adminEmail: z
      .string()
      .trim()
      .min(1, "Administrator email is required")
      .email("Please provide a valid email address"),
    adminPassword: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(128, "Password must not exceed 128 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    adminName: z.string().trim().max(100).optional(),
    adminPhone: z.string().trim().max(20).optional(),

    // Content Management / Branding
    appName: z
      .string()
      .trim()
      .min(2, "Application name must be at least 2 characters")
      .max(100, "Application name must not exceed 100 characters"),
    appDescription: z.string().trim().max(255).optional(),
    logoUrl: z.string().trim().optional(),
    faviconUrl: z.string().trim().optional(),
    organizationName: z.string().trim().max(150).optional(),
    supportEmail: z
      .string()
      .trim()
      .email("Please provide a valid support email")
      .optional()
      .or(z.literal("")),
    footerText: z.string().trim().max(255).optional(),
  })
  .refine((data) => data.adminPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export const UpdateBrandingSchema = z.object({
  appName: z
    .string()
    .trim()
    .min(2, "Application name must be at least 2 characters")
    .max(100, "Application name must not exceed 100 characters"),
  appDescription: z.string().trim().max(255).optional(),
  logoUrl: z.string().trim().optional(),
  faviconUrl: z.string().trim().optional(),
  organizationName: z.string().trim().max(150).optional(),
  supportEmail: z
    .string()
    .trim()
    .email("Please provide a valid support email")
    .optional()
    .or(z.literal("")),
  footerText: z.string().trim().max(255).optional(),
  allowedDashboardRoles: z.array(z.string()).optional(),
})

export type InitialSetupFormData = z.infer<typeof InitialSetupSchema>
export type UpdateBrandingFormData = z.infer<typeof UpdateBrandingSchema>
