import { z } from "zod"

export interface Permission {
  id: string
  code: string
  resource: string
  action: string
  description?: string | null
}

export interface RolePermissionRelation {
  id?: string
  roleId: string
  permissionId: string
  permission?: Permission
}

export interface Role {
  id: string
  code: string
  name: string
  description?: string | null
  isSystem?: boolean
  permissions?: string[]
  rolePermissions?: RolePermissionRelation[]
  createdAt?: string
}

export interface UserPermissionOverride {
  permissionCode: string
  effect: "GRANT" | "REVOKE"
}

export const CreateRoleSchema = z.object({
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(50, "Code cannot exceed 50 characters")
    .regex(/^[A-Z][A-Z0-9_]{1,49}$/, "Code must be UPPER_SNAKE_CASE (e.g. AUDITOR, BILLING_ADMIN)"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name cannot exceed 100 characters"),
  description: z.string().max(255).optional(),
  isSystem: z.boolean().optional(),
  permissionCodes: z.array(z.string()).optional(),
})

export type CreateRoleInput = z.infer<typeof CreateRoleSchema>

export const UpdateRoleSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name cannot exceed 100 characters").optional(),
  description: z.string().max(255).optional(),
})

export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>

export const CreatePermissionSchema = z.object({
  code: z
    .string()
    .regex(/^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/, "Code must be resource:action format (e.g. patient:read, billing:export)"),
  resource: z
    .string()
    .min(1, "Resource is required")
    .max(50, "Resource cannot exceed 50 characters")
    .regex(/^[a-z][a-z0-9_]*$/, "Resource must be lowercase with underscores"),
  action: z
    .string()
    .min(1, "Action is required")
    .max(50, "Action cannot exceed 50 characters")
    .regex(/^[a-z][a-z0-9_]*$/, "Action must be lowercase with underscores"),
  description: z.string().max(255).optional(),
})

export type CreatePermissionInput = z.infer<typeof CreatePermissionSchema>

export const SetRolePermissionsSchema = z.object({
  permissionCodes: z.array(z.string()),
})

export type SetRolePermissionsInput = z.infer<typeof SetRolePermissionsSchema>

export const OverridePermissionSchema = z.object({
  userId: z.string().uuid("Invalid user UUID"),
  permissionCode: z.string().min(1, "Permission code is required"),
  effect: z.enum(["GRANT", "REVOKE"]),
})

export type OverridePermissionInput = z.infer<typeof OverridePermissionSchema>

export const AssignRoleSchema = z.object({
  userId: z.string().uuid("Invalid user UUID"),
  roleCode: z.string().min(1, "Role code is required"),
  assignedBy: z.string().uuid().optional(),
})

export type AssignRoleInput = z.infer<typeof AssignRoleSchema>

export const BulkAssignRolesSchema = z.object({
  userId: z.string().uuid("Invalid user UUID"),
  roleCodes: z.array(z.string()),
  assignedBy: z.string().uuid().optional(),
})

export type BulkAssignRolesInput = z.infer<typeof BulkAssignRolesSchema>
