import { z } from "zod"

export const EmploymentStatusSchema = z.enum([
  "ACTIVE",
  "ON_LEAVE",
  "RESIGNED",
  "TERMINATED",
])

export const EmploymentTypeSchema = z.enum([
  "FULL_TIME",
  "PART_TIME",
  "CONTRACTOR",
  "INTERN",
])

export const EmployeeGenderSchema = z.enum(["MALE", "FEMALE", "OTHER"])

const CODE_REGEX = /^[A-Z][A-Z0-9_]{1,49}$/
const TIME_REGEX = /^\d{2}:\d{2}(:\d{2})?$/

export const CreateDepartmentSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(CODE_REGEX, "Code must be UPPER_SNAKE_CASE (2-50 chars, starting with A-Z)"),
  name: z.string().trim().min(1, "Department name is required").max(100),
  description: z.string().trim().optional().or(z.literal("")),
  parentId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
})

export const UpdateDepartmentSchema = CreateDepartmentSchema.omit({ code: true }).partial()

export const CreateJobTitleSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(CODE_REGEX, "Code must be UPPER_SNAKE_CASE (2-50 chars, starting with A-Z)"),
  name: z.string().trim().min(1, "Job title name is required").max(100),
  category: z.string().trim().max(50).optional().or(z.literal("")),
  description: z.string().trim().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
})

export const UpdateJobTitleSchema = CreateJobTitleSchema.omit({ code: true }).partial()

export const CreateEmployeeSchema = z.object({
  employeeCode: z
    .string()
    .trim()
    .max(30, "Employee code must be 30 characters or less")
    .optional()
    .or(z.literal("")),
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(150, "Full name must be 150 characters or less"),
  userId: z.string().uuid("User ID must be a valid UUID").nullable().optional(),
  provisionUser: z
    .object({
      email: z.string().trim().email("Valid login email is required"),
      password: z.string().min(8, "Temporary password must be at least 8 characters"),
      roles: z.array(z.string()).optional(),
    })
    .optional(),
  gender: EmployeeGenderSchema.optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
  nationalId: z.string().trim().max(50).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  avatarUrl: z.string().trim().optional().or(z.literal("")),
  hireDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Hire date must be YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
  employmentType: EmploymentTypeSchema.optional().default("FULL_TIME"),
  managerId: z.string().uuid("Manager ID must be a valid UUID").nullable().optional(),
})

export const UpdateEmployeeSchema = CreateEmployeeSchema.omit({
  userId: true,
  provisionUser: true,
  employeeCode: true,
}).partial()

export const AssignPositionSchema = z
  .object({
    jobTitleCode: z.string().trim().min(1, "Job title is required"),
    departmentCode: z.string().trim().optional().or(z.literal("")),
    isPrimary: z.boolean().optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD")
      .optional()
      .or(z.literal("")),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (d) => !d.startDate || !d.endDate || d.startDate <= d.endDate,
    { message: "Start date cannot be after end date" }
  )

export const CreateScheduleSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(TIME_REGEX, "Start time must be HH:mm"),
    endTime: z.string().regex(TIME_REGEX, "End time must be HH:mm"),
    departmentId: z.string().uuid().optional(),
    isActive: z.boolean().optional().default(true),
  })
  .refine(
    (d) => {
      const s = d.startTime.length === 5 ? `${d.startTime}:00` : d.startTime
      const e = d.endTime.length === 5 ? `${d.endTime}:00` : d.endTime
      return s < e
    },
    { message: "Start time must be earlier than end time" }
  )

export const UpdateScheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: z.string().regex(TIME_REGEX, "Start time must be HH:mm").optional(),
  endTime: z.string().regex(TIME_REGEX, "End time must be HH:mm").optional(),
  departmentId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
})
