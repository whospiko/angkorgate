import test, { describe } from "node:test"
import assert from "node:assert/strict"
import {
  CreateRoleSchema,
  UpdateRoleSchema,
  CreatePermissionSchema,
  SetRolePermissionsSchema,
  OverridePermissionSchema,
  AssignRoleSchema,
  BulkAssignRolesSchema,
} from "./rbac.types"

describe("features/rbac: Validation Schemas", () => {
  describe("CreateRoleSchema", () => {
    test("accepts valid uppercase role codes and names", () => {
      const validInputs = [
        { code: "ADMIN", name: "Administrator" },
        { code: "COMPLIANCE_OFFICER", name: "Compliance Officer", description: "Audit access" },
        {
          code: "SUPPORT_TIER_2",
          name: "Support Tier 2",
          permissionCodes: ["customer:read", "customer:write"],
        },
      ]

      for (const input of validInputs) {
        const res = CreateRoleSchema.safeParse(input)
        assert.strictEqual(res.success, true, `Expected valid role code for ${input.code}`)
      }
    })

    test("rejects lowercase or invalid role codes", () => {
      const invalidCodes = ["admin", "Role-Name", "123_ADMIN", "A", "ADMIN CODE WITH SPACES"]

      for (const code of invalidCodes) {
        const res = CreateRoleSchema.safeParse({ code, name: "Test Role" })
        assert.strictEqual(res.success, false, `Expected ${code} to be rejected`)
      }
    })

    test("rejects empty name", () => {
      const res = CreateRoleSchema.safeParse({ code: "OPERATOR", name: " " })
      assert.strictEqual(res.success, false)
    })
  })

  describe("UpdateRoleSchema", () => {
    test("accepts valid update payload", () => {
      const res = UpdateRoleSchema.safeParse({
        name: "Senior Lead Administrator",
        description: "Updated description",
      })
      assert.strictEqual(res.success, true)
    })

    test("accepts empty object (partial update)", () => {
      const res = UpdateRoleSchema.safeParse({})
      assert.strictEqual(res.success, true)
    })
  })

  describe("CreatePermissionSchema", () => {
    test("accepts valid resource:action permission codes", () => {
      const validPermissions = [
        { code: "patient:read", resource: "patient", action: "read" },
        { code: "user:write", resource: "user", action: "write" },
        { code: "billing_invoice:export_pdf", resource: "billing_invoice", action: "export_pdf" },
      ]

      for (const input of validPermissions) {
        const res = CreatePermissionSchema.safeParse(input)
        assert.strictEqual(res.success, true, `Expected valid permission for ${input.code}`)
      }
    })

    test("rejects invalid permission code formats", () => {
      const invalidCodes = [
        { code: "PATIENT:READ", resource: "patient", action: "read" },
        { code: "patient_read", resource: "patient", action: "read" },
        { code: "patient:", resource: "patient", action: "read" },
        { code: ":read", resource: "patient", action: "read" },
      ]

      for (const input of invalidCodes) {
        const res = CreatePermissionSchema.safeParse(input)
        assert.strictEqual(res.success, false, `Expected ${input.code} to be rejected`)
      }
    })
  })

  describe("SetRolePermissionsSchema", () => {
    test("accepts array of permission codes", () => {
      const res = SetRolePermissionsSchema.safeParse({
        permissionCodes: ["user:read", "user:write", "customer:read"],
      })
      assert.strictEqual(res.success, true)
      if (res.success) {
        assert.strictEqual(res.data.permissionCodes.length, 3)
      }
    })

    test("accepts empty array of permission codes", () => {
      const res = SetRolePermissionsSchema.safeParse({
        permissionCodes: [],
      })
      assert.strictEqual(res.success, true)
    })
  })

  describe("OverridePermissionSchema", () => {
    test("accepts valid override with GRANT or REVOKE", () => {
      const valid = {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        permissionCode: "customer:read",
        effect: "GRANT" as const,
      }
      const res = OverridePermissionSchema.safeParse(valid)
      assert.strictEqual(res.success, true)

      const revokeRes = OverridePermissionSchema.safeParse({
        ...valid,
        effect: "REVOKE",
      })
      assert.strictEqual(revokeRes.success, true)
    })

    test("rejects invalid UUID or effect", () => {
      const res = OverridePermissionSchema.safeParse({
        userId: "not-a-uuid",
        permissionCode: "customer:read",
        effect: "ALLOW",
      })
      assert.strictEqual(res.success, false)
    })
  })

  describe("AssignRoleSchema & BulkAssignRolesSchema", () => {
    test("accepts valid assign role payload", () => {
      const res = AssignRoleSchema.safeParse({
        userId: "123e4567-e89b-12d3-a456-426614174000",
        roleCode: "DOCTOR",
      })
      assert.strictEqual(res.success, true)
    })

    test("accepts valid bulk assign payload", () => {
      const res = BulkAssignRolesSchema.safeParse({
        userId: "123e4567-e89b-12d3-a456-426614174000",
        roleCodes: ["DOCTOR", "ACCOUNTANT"],
      })
      assert.strictEqual(res.success, true)
    })
  })
})
