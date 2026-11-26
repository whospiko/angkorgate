import { z } from "zod"

export const CustomerTypeSchema = z.enum(["PATIENT", "GUEST", "CUSTOMER"])
export const CustomerGenderSchema = z.enum(["MALE", "FEMALE", "OTHER"])
export const CustomerStatusSchema = z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"])

const PHONE_REGEX = /^\+?[0-9]{8,20}$/

export const CreateCustomerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(150, "Full name must be 150 characters or less"),
  type: CustomerTypeSchema.optional().default("CUSTOMER"),
  gender: CustomerGenderSchema.optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be YYYY-MM-DD"),
  phone: z
    .string()
    .trim()
    .regex(PHONE_REGEX, "Phone must be 8-20 digits with optional leading +")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Must be a valid email address")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  nationalId: z
    .string()
    .trim()
    .max(50, "National ID must be 50 characters or less")
    .optional()
    .or(z.literal("")),
  avatarUrl: z.string().trim().optional().or(z.literal("")),
  userId: z.string().uuid("User ID must be a valid UUID").optional().or(z.literal("")),
})

export const UpdateCustomerSchema = CreateCustomerSchema.omit({
  type: true,
  userId: true,
}).partial()

export const CreateContactSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Contact name is required")
    .max(150, "Contact name must be 150 characters or less"),
  relationship: z.string().trim().max(50).optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(PHONE_REGEX, "Phone must be 8-20 digits with optional leading +")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Must be a valid email address")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  isPrimary: z.boolean().optional(),
})

export const UpdateContactSchema = CreateContactSchema.partial()

export const SetAttributeSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "Attribute key is required")
    .max(100, "Attribute key must be 100 characters or less"),
  value: z.unknown().refine((v) => v !== undefined && v !== "", "Value is required"),
})
