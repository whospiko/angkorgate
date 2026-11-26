import test, { describe, beforeEach, afterEach } from "node:test"
import assert from "node:assert/strict"
import {
  getPasskeyRegistrationOptionsAction,
  verifyPasskeyRegistrationAction,
  getMyPasskeysAction,
  renamePasskeyAction,
  deletePasskeyAction,
  getPasskeyAuthOptionsAction,
  verifyPasskeyAuthAction,
  getAdminUserPasskeysAction,
  adminRevokeUserPasskeyAction,
} from "./passkey-actions"
import { apiClient } from "@/lib/api-client"

describe("features/auth: Passkey Server Actions", () => {
  const originalPost = apiClient.post
  const originalGet = apiClient.get
  const originalPatch = apiClient.patch
  const originalDelete = apiClient.delete

  afterEach(() => {
    apiClient.post = originalPost
    apiClient.get = originalGet
    apiClient.patch = originalPatch
    apiClient.delete = originalDelete
  })

  test("getPasskeyRegistrationOptionsAction delegates to /auth/passkey/register/options", async () => {
    apiClient.post = async (url: string, data?: any) => {
      assert.equal(url, "/auth/passkey/register/options")
      assert.equal(data.userDisplayName, "Piko Admin")
      return { challenge: "mock-reg-chal-xyz" } as any
    }

    const res = await getPasskeyRegistrationOptionsAction("Piko Admin")
    assert.equal(res.success, true)
    assert.equal((res.options as any).challenge, "mock-reg-chal-xyz")
  })

  test("verifyPasskeyRegistrationAction verifies attestation and returns passkey", async () => {
    apiClient.post = async (url: string, data?: any) => {
      assert.equal(url, "/auth/passkey/register/verify")
      assert.equal(data.friendlyName, "MacBook Touch ID")
      return {
        id: "pk-123",
        credentialId: "cred-abc",
        friendlyName: "MacBook Touch ID",
        deviceType: "singleDevice",
        backedUp: false,
        lastUsedAt: null,
        createdAt: "2026-11-24T00:00:00Z",
      } as any
    }

    const res = await verifyPasskeyRegistrationAction({ id: "cred-abc" }, "MacBook Touch ID")
    assert.equal(res.success, true)
    assert.equal(res.passkey?.credentialId, "cred-abc")
    assert.equal(res.passkey?.friendlyName, "MacBook Touch ID")
  })

  test("getMyPasskeysAction returns passkeys list", async () => {
    apiClient.get = async (url: string) => {
      assert.equal(url, "/auth/passkey/list")
      return [
        {
          id: "pk-1",
          credentialId: "c1",
          friendlyName: "Touch ID",
          deviceType: "singleDevice",
          backedUp: false,
          lastUsedAt: null,
          createdAt: "2026-11-24T00:00:00Z",
        },
      ] as any
    }

    const res = await getMyPasskeysAction()
    assert.equal(res.success, true)
    assert.equal(res.passkeys?.length, 1)
    assert.equal(res.passkeys?.[0].friendlyName, "Touch ID")
  })

  test("renamePasskeyAction and deletePasskeyAction execute proper HTTP mutations", async () => {
    apiClient.patch = async (url: string, data?: any) => {
      assert.equal(url, "/auth/passkey/pk-1")
      assert.equal(data.friendlyName, "Updated Name")
      return { id: "pk-1", friendlyName: "Updated Name" } as any
    }

    apiClient.delete = async (url: string) => {
      assert.equal(url, "/auth/passkey/pk-1")
      return { success: true, message: "Deleted" } as any
    }

    const renameRes = await renamePasskeyAction("pk-1", "Updated Name")
    assert.equal(renameRes.success, true)
    assert.equal(renameRes.passkey?.friendlyName, "Updated Name")

    const deleteRes = await deletePasskeyAction("pk-1")
    assert.equal(deleteRes.success, true)
    assert.equal(deleteRes.message, "Deleted")
  })

  test("getPasskeyAuthOptionsAction retrieves authentication options", async () => {
    apiClient.post = async (url: string, data?: any) => {
      assert.equal(url, "/auth/passkey/authenticate/options")
      assert.equal(data.email, "admin@angkorgate.local")
      return {
        challenge: "auth-chal-789",
        challengeId: "cid-123",
        rpId: "localhost",
      } as any
    }

    const res = await getPasskeyAuthOptionsAction("admin@angkorgate.local")
    assert.equal(res.success, true)
    assert.equal(res.options?.challenge, "auth-chal-789")
    assert.equal(res.options?.challengeId, "cid-123")
  })

  test("verifyPasskeyAuthAction routes users without authorized dashboard role to /account", async () => {
    apiClient.post = async (url: string) => {
      if (url === "/auth/passkey/authenticate/verify") {
        return {
          accessToken: "jwt-customer",
          refreshToken: "refresh-customer",
          accessTokenExpiresIn: 900,
          refreshTokenExpiresIn: 604800,
          user: {
            id: "u-cust",
            email: "customer@example.com",
            roles: ["CUSTOMER"],
            mustChangePassword: false,
          },
        } as any
      }
      throw new Error(`Unexpected post url: ${url}`)
    }

    apiClient.get = async (url: string) => {
      if (url === "/system/branding") {
        return {
          allowedDashboardRoles: ["ADMIN", "MANAGER"],
        } as any
      }
      throw new Error(`Unexpected get url: ${url}`)
    }

    const res = await verifyPasskeyAuthAction("cid-1", { id: "cred-1" })
    assert.equal(res.success, true)
    assert.equal(res.redirectUrl, "/account")
  })

  test("verifyPasskeyAuthAction authorizes admins and returns redirectUrl", async () => {
    apiClient.post = async (url: string) => {
      if (url === "/auth/passkey/authenticate/verify") {
        return {
          accessToken: "jwt-admin",
          refreshToken: "refresh-admin",
          accessTokenExpiresIn: 900,
          refreshTokenExpiresIn: 604800,
          user: {
            id: "u-admin",
            email: "admin@angkorgate.local",
            roles: ["ADMIN"],
            mustChangePassword: false,
          },
        } as any
      }
      throw new Error(`Unexpected post url: ${url}`)
    }

    apiClient.get = async (url: string) => {
      if (url === "/system/branding") {
        return {
          allowedDashboardRoles: ["ADMIN"],
        } as any
      }
      throw new Error(`Unexpected get url: ${url}`)
    }

    const res = await verifyPasskeyAuthAction("cid-1", { id: "cred-1" }, "/apps")
    assert.equal(res.success, true)
    assert.equal(res.redirectUrl, "/apps")
  })

  test("getAdminUserPasskeysAction and adminRevokeUserPasskeyAction", async () => {
    apiClient.get = async (url: string) => {
      assert.equal(url, "/auth/passkey/admin/users/u-target")
      return [{ id: "pk-1", friendlyName: "Target Key" }] as any
    }

    apiClient.delete = async (url: string) => {
      assert.equal(url, "/auth/passkey/admin/users/u-target/pk-1")
      return { success: true, message: "Revoked by admin" } as any
    }

    const listRes = await getAdminUserPasskeysAction("u-target")
    assert.equal(listRes.success, true)
    assert.equal(listRes.passkeys?.length, 1)

    const revokeRes = await adminRevokeUserPasskeyAction("u-target", "pk-1")
    assert.equal(revokeRes.success, true)
    assert.equal(revokeRes.message, "Revoked by admin")
  })
})
