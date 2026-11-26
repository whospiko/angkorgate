import test, { describe } from "node:test"
import assert from "node:assert/strict"
import React from "react"
import ReactDOMServer from "react-dom/server"
import {
  UpdateUserSchema,
  AdminResetPasswordSchema,
  type User,
  type LinkedAccount,
  type UserSession,
} from "../types/users.types"
import { UserDetailTabsView } from "./user-detail-tabs-view"
import { UserSessionsCard } from "./user-sessions-card"
import type { Role, Permission } from "@/features/rbac/types/rbac.types"

describe("features/users: User Detail Schemas & Tabs View", () => {
  const mockUser: User = {
    id: "af590d77-b22b-41f9-839d-411f8d807289",
    email: "piko.admin@angkorgate.local",
    phone: "+85512345678",
    isActive: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    mustChangePassword: false,
    failedAttempts: 2,
    roles: ["ADMIN", "MANAGER"],
    createdAt: "2026-11-20T00:00:00Z",
    updatedAt: "2026-11-22T00:00:00Z",
  }

  const mockRoles: Role[] = [
    {
      id: "role-1",
      code: "ADMIN",
      name: "Administrator",
      description: "Full system administration access",
      permissions: ["user:read", "user:write", "user:delete"],
      isSystem: true,
    },
    {
      id: "role-2",
      code: "MANAGER",
      name: "Operations Manager",
      description: "Staff and operational management",
      permissions: ["employee:read", "employee:write"],
      isSystem: false,
    },
  ]

  const mockPermissions: Permission[] = [
    { id: "p1", code: "user:read", resource: "user", action: "read", description: "View users" },
    { id: "p2", code: "user:write", resource: "user", action: "write", description: "Create/edit users" },
    { id: "p3", code: "user:delete", resource: "user", action: "delete", description: "Delete users" },
    { id: "p4", code: "employee:read", resource: "employee", action: "read", description: "View employees" },
    { id: "p5", code: "employee:write", resource: "employee", action: "write", description: "Create/edit employees" },
  ]

  describe("Validation Schemas", () => {
    test("UpdateUserSchema validates valid update payloads", () => {
      const valid = UpdateUserSchema.parse({
        email: "updated@example.com",
        phone: "+85598765432",
        isActive: false,
        isEmailVerified: true,
      })
      assert.equal(valid.email, "updated@example.com")
      assert.equal(valid.phone, "+85598765432")
      assert.equal(valid.isActive, false)
    })

    test("UpdateUserSchema rejects invalid email format", () => {
      assert.throws(() => {
        UpdateUserSchema.parse({ email: "invalid-email" })
      })
    })

    test("AdminResetPasswordSchema validates valid passwords and enforces >=8 chars", () => {
      const valid = AdminResetPasswordSchema.parse({
        newPassword: "SecurePassword123!",
      })
      assert.equal(valid.newPassword, "SecurePassword123!")
      assert.equal(valid.mustChangePassword, true)

      assert.throws(() => {
        AdminResetPasswordSchema.parse({ newPassword: "short" })
      })
    })
  })

  describe("UserDetailTabsView rendering", () => {
    test("renders user detail view with Employee linked account", () => {
      const linkedEmployee: LinkedAccount = {
        type: "employee",
        data: {
          id: "emp-101",
          employeeCode: "EMP-001",
          fullName: "Sophea Chan",
          employmentStatus: "ACTIVE",
          departmentCode: "IT",
          jobTitleCode: "TECH_LEAD",
        },
      }

      const html = ReactDOMServer.renderToString(
        React.createElement(UserDetailTabsView, {
          user: mockUser,
          allRoles: mockRoles,
          allPermissions: mockPermissions,
          linkedAccount: linkedEmployee,
          defaultTab: "information",
        })
      )

      assert.ok(html.includes("piko.admin@angkorgate.local"))
      assert.ok(html.includes("af590d77-b22b-41f9-839d-411f8d807289"))
      assert.ok(html.includes("Sophea Chan"))
      assert.ok(html.includes("EMP-001"))
      assert.ok(html.includes("Information"))
      assert.ok(html.includes("Assign"))
      assert.ok(html.includes("Security"))
    })

    test("renders user detail view with Customer linked account", () => {
      const linkedCustomer: LinkedAccount = {
        type: "customer",
        data: {
          id: "cust-202",
          customerCode: "CUST-0099",
          fullName: "Dara Sok",
          type: "PATIENT",
          status: "ACTIVE",
        },
      }

      const html = ReactDOMServer.renderToString(
        React.createElement(UserDetailTabsView, {
          user: mockUser,
          allRoles: mockRoles,
          allPermissions: mockPermissions,
          linkedAccount: linkedCustomer,
          defaultTab: "information",
        })
      )

      assert.ok(html.includes("Dara Sok"))
      assert.ok(html.includes("CUST-0099"))
      assert.ok(html.includes("CRM Customer"))
    })

    test("renders user detail view with connected social identities", () => {
      const html = ReactDOMServer.renderToString(
        React.createElement(UserDetailTabsView, {
          user: { ...mockUser, email: null, phone: null },
          allRoles: mockRoles,
          allPermissions: mockPermissions,
          linkedAccount: {
            type: "customer",
            data: {
              id: "cust-tg",
              customerCode: "CUS-0003",
              fullName: "Heng Kakada",
              type: "CUSTOMER",
              status: "ACTIVE",
            },
          },
          oauthAccounts: [
            {
              id: "oa-1",
              provider: "telegram",
              providerUserId: "2109292535",
              email: null,
              rawProfile: { username: "hengkakada01" },
              linkedAt: "2026-11-26T00:00:00Z",
            },
          ],
          defaultTab: "information",
        })
      )

      assert.ok(html.includes("Heng Kakada"))
      assert.ok(html.includes("Connected Social Identities"))
      assert.ok(html.includes("@hengkakada01"))
      assert.ok(html.includes("2109292535"))
    })

    test("renders user detail view with unlinked account", () => {
      const unlinked: LinkedAccount = { type: "none" }

      const html = ReactDOMServer.renderToString(
        React.createElement(UserDetailTabsView, {
          user: mockUser,
          allRoles: mockRoles,
          allPermissions: mockPermissions,
          linkedAccount: unlinked,
          defaultTab: "information",
        })
      )

      assert.ok(html.includes("Non-Linked Auth Account"))
    })

    test("renders user detail security tab with enriched active sessions and Revoke All Other Sessions", () => {
      const mockSessions: UserSession[] = [
        {
          id: "sess-1",
          familyId: "fam-1",
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/131.0.0.0 Safari/537.36",
          browser: "Chrome 131",
          os: "macOS 10.15",
          deviceType: "desktop",
          ipAddress: "203.0.113.10",
          lastActiveAt: new Date().toISOString(),
          createdAt: "2026-11-26T00:00:00Z",
          expiresAt: "2026-12-03T00:00:00Z",
          isCurrent: true,
        },
        {
          id: "sess-2",
          familyId: "fam-2",
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) Version/18.1 Mobile/15E148 Safari/604.1",
          browser: "Safari 18",
          os: "iOS 18.1",
          deviceType: "mobile",
          ipAddress: "198.51.100.42",
          lastActiveAt: new Date(Date.now() - 5 * 60_000).toISOString(),
          createdAt: "2026-11-25T10:00:00Z",
          expiresAt: "2026-12-02T10:00:00Z",
          isCurrent: false,
        },
      ]

      const html = ReactDOMServer.renderToString(
        React.createElement(UserSessionsCard, {
          userId: mockUser.id,
          initialSessions: mockSessions,
        })
      )

      assert.ok(html.includes("Chrome 131 on macOS 10.15"))
      assert.ok(html.includes("Safari 18 on iOS 18.1"))
      assert.ok(html.includes("203.0.113.10"))
      assert.ok(html.includes("198.51.100.42"))
      assert.ok(html.includes("Last Active:"))
      assert.ok(html.includes("THIS DEVICE"))
      assert.ok(html.includes("Revoke All Other Sessions"))
    })
  })
})
